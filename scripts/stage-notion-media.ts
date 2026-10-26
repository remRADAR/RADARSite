import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { convertNotionImageToWebp, notionAssetKey, validateNotionImageUrl } from "../src/lib/notion-media";
import { putMediaObject, putStorageObject } from "../src/lib/media-storage";
import { NOTION_MEDIA_STAGING_MANIFEST_KEY } from "../src/lib/notion-media";
import { EDITORIAL_PROPERTY_NAMES, NOTION_API_VERSION, notionFeaturedImageSource, readNotionProperty, type NotionBlock, type NotionPage } from "../src/lib/notion-editorial-sync";

type ImageAsset = {
  pageId: string;
  blockId: string;
  role: "featured" | "inline";
  placementIndex?: number;
  sourceUrl: string;
  sourceUrlWithoutQuery: string;
  alt: string;
};

type StagedAsset = ImageAsset & {
  sourceBytes: number;
  sourceContentType: string;
  sourceSha256: string;
  checksum: string;
  key: string;
  deliveryUrl: string;
  outputBytes: number;
  status: "staged" | "already-present" | "dry-run";
};

type Manifest = {
  version: 1;
  generatedAt: string;
  apply: boolean;
  pages: string[];
  assets: Array<Omit<StagedAsset, "sourceUrl">>;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_BLOCKS = 1500;
const NOTION_TOKEN = process.env.NOTION_API_KEY || "";
const DATA_SOURCE_ID = process.env.RADAR_NOTION_DATA_SOURCE_ID || "";
const DEFAULT_PAGES = [
  "3ff58434-c727-81c6-acc7-e3a3e98cf593", // 7UAD
  "3fb58434-c727-8193-ab8e-dfa1d75a6ab2", // Halver and Duncan Mighty
];

function usage(): never {
  console.error(`Usage: npm run notion:media-stage -- [--apply] [--keep-temp] [--manifest <path>] <page-id> [...page-id]

Defaults to the two currently affected article pages when no page IDs are supplied.
Without --apply, downloads and validates images but does not write to R2.
Required environment: NOTION_API_KEY, RADAR_NOTION_DATA_SOURCE_ID, R2_ACCOUNT_ID, R2_BUCKET,
R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_BASE_URL for --apply.`);
  process.exit(2);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let apply = false;
  let keepTemp = false;
  let manifestPath = "notion-media-staging-manifest.json";
  const pages: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--keep-temp") keepTemp = true;
    else if (arg === "--manifest") manifestPath = args[++i] || usage();
    else if (arg === "--help" || arg === "-h") usage();
    else if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(arg)) pages.push(arg);
    else usage();
  }
  return { apply, keepTemp, manifestPath, pages: pages.length ? pages : DEFAULT_PAGES };
}

function required(value: string, name: string): string {
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

async function notionJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${required(NOTION_TOKEN, "NOTION_API_KEY")}`,
      "Notion-Version": NOTION_API_VERSION,
      accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`NOTION_HTTP_${response.status}:${new URL(url).pathname}`);
  return await response.json() as T;
}

async function children(blockId: string): Promise<NotionBlock[]> {
  const output: NotionBlock[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("start_cursor", cursor);
    const response = await notionJson<{ results?: NotionBlock[]; has_more?: boolean; next_cursor?: string | null }>(
      `https://api.notion.com/v1/blocks/${encodeURIComponent(blockId)}/children?${query.toString()}`,
    );
    if (!Array.isArray(response.results)) throw new Error(`NOTION_INVALID_BLOCK_LIST:${blockId}`);
    output.push(...response.results);
    if (output.length > MAX_BLOCKS) throw new Error(`NOTION_TOO_MANY_BLOCKS:${blockId}`);
    cursor = response.has_more ? response.next_cursor || "" : "";
    if (response.has_more && !cursor) throw new Error(`NOTION_INVALID_PAGINATION:${blockId}`);
  } while (cursor);
  return output;
}

function urlWithoutQuery(value: string): string {
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

function imageUrl(block: NotionBlock): string {
  const value = block[block.type];
  if (!value || typeof value !== "object") return "";
  const data = value as Record<string, unknown>;
  const external = data.external && typeof data.external === "object" ? data.external as Record<string, unknown> : undefined;
  const file = data.file && typeof data.file === "object" ? data.file as Record<string, unknown> : undefined;
  return typeof external?.url === "string" ? external.url : typeof file?.url === "string" ? file.url : "";
}

function caption(block: NotionBlock): string {
  const value = block[block.type];
  if (!value || typeof value !== "object") return "";
  const raw = (value as Record<string, unknown>).caption;
  if (!Array.isArray(raw)) return "";
  return raw.map((part) => part && typeof part === "object" ? String((part as Record<string, unknown>).plain_text || "") : "").join("").trim();
}

async function collectPageAssets(pageId: string): Promise<ImageAsset[]> {
  const page = await notionJson<NotionPage>(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`);
  if (DATA_SOURCE_ID && page.parent && typeof page.parent === "object") {
    const parent = page.parent as Record<string, unknown>;
    const parentId = String(parent.data_source_id || parent.database_id || "").replaceAll("-", "").toLowerCase();
    if (parentId && parentId !== DATA_SOURCE_ID.replaceAll("-", "").toLowerCase()) throw new Error(`PAGE_NOT_IN_CONFIGURED_DATA_SOURCE:${pageId}`);
  }
  const assets: ImageAsset[] = [];
  const featuredSource = notionFeaturedImageSource(page);
  if (featuredSource) assets.push({ pageId, blockId: "featured-image", role: "featured", sourceUrl: featuredSource, sourceUrlWithoutQuery: urlWithoutQuery(featuredSource), alt: String(readNotionProperty(page, EDITORIAL_PROPERTY_NAMES.title) || "") });

  const visit = async (items: NotionBlock[]): Promise<void> => {
    for (const block of items) {
      if (block.type === "image") {
        const sourceUrl = imageUrl(block);
        if (!sourceUrl) throw new Error(`NOTION_IMAGE_URL_MISSING:${block.id}`);
        assets.push({ pageId, blockId: block.id, role: "inline", placementIndex: assets.filter((asset) => asset.role === "inline").length, sourceUrl, sourceUrlWithoutQuery: urlWithoutQuery(sourceUrl), alt: caption(block) });
      }
      if (block.has_children) await visit(await children(block.id));
    }
  };
  await visit(await children(pageId));
  return assets;
}

async function downloadToLocal(asset: ImageAsset, directory: string) {
  const url = validateNotionImageUrl(asset.sourceUrl);
  const response = await fetch(url, { cache: "no-store", redirect: "error", headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" } });
  if (!response.ok) throw new Error(`IMAGE_HTTP_${response.status}:${asset.pageId}:${asset.blockId}`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error(`IMAGE_TOO_LARGE:${asset.pageId}:${asset.blockId}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error(`IMAGE_SIZE_INVALID:${asset.pageId}:${asset.blockId}`);
  const contentType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].toLowerCase();
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const localPath = join(directory, `${sourceSha256}.source`);
  await writeFile(localPath, bytes, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  return { bytes, contentType, sourceSha256, localPath };
}

async function stageAsset(asset: ImageAsset, directory: string, apply: boolean): Promise<StagedAsset> {
  const local = await downloadToLocal(asset, directory);
  const converted = await convertNotionImageToWebp({ bytes: local.bytes, contentType: local.contentType });
  const key = notionAssetKey(converted.checksum, "webp");
  let deliveryUrl = "";
  let status: StagedAsset["status"] = "dry-run";
  if (apply) {
    const stored = await putMediaObject({ key, body: converted.body, contentType: "image/webp", metadata: {
      "source-provider": "notion",
      checksum: converted.checksum,
      "source-checksum": converted.sourceChecksum,
      "source-content-type": converted.sourceMimeType,
      conversion: "webp-q80-max2400-v1",
    } });
    deliveryUrl = stored.url;
    status = "staged";
  }
  return { ...asset, sourceBytes: converted.sourceBytes, sourceContentType: converted.sourceMimeType, sourceSha256: converted.sourceChecksum, checksum: converted.checksum, key, deliveryUrl, outputBytes: converted.body.byteLength, status };
}

export async function stageNotionMediaPages(input: { apply: boolean; keepTemp?: boolean; manifestPath?: string; pages: string[] }) {
  const { apply, keepTemp = false, manifestPath = "notion-media-staging-manifest.json", pages } = input;
  if (apply) {
    required(process.env.R2_ACCOUNT_ID || "", "R2_ACCOUNT_ID");
    required(process.env.R2_BUCKET || "", "R2_BUCKET");
    required(process.env.R2_ACCESS_KEY_ID || "", "R2_ACCESS_KEY_ID");
    required(process.env.R2_SECRET_ACCESS_KEY || "", "R2_SECRET_ACCESS_KEY");
    required(process.env.R2_PUBLIC_BASE_URL || "", "R2_PUBLIC_BASE_URL");
  }
  const temp = await mkdtemp(join(tmpdir(), "radarsite-notion-media-"));
  const assets: StagedAsset[] = [];
  try {
    for (const pageId of pages) {
      const pageAssets = await collectPageAssets(pageId);
      if (!pageAssets.length) console.warn(`No image assets found for ${pageId}`);
      for (const asset of pageAssets) {
        const duplicate = assets.find((item) => item.sourceSha256 && item.sourceUrlWithoutQuery === asset.sourceUrlWithoutQuery);
        if (duplicate) {
          assets.push({ ...duplicate, ...asset, status: duplicate.status });
          continue;
        }
        assets.push(await stageAsset(asset, temp, apply));
      }
    }
    const manifestAssets = assets.map((asset) => Object.fromEntries(Object.entries(asset).filter(([key]) => key !== "sourceUrl")) as Omit<StagedAsset, "sourceUrl">);
    const manifest: Manifest = { version: 1, generatedAt: new Date().toISOString(), apply, pages, assets: manifestAssets };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    if (apply) {
      await putStorageObject({
        key: NOTION_MEDIA_STAGING_MANIFEST_KEY,
        body: Buffer.from(JSON.stringify(manifest)),
        contentType: "application/json; charset=utf-8",
        cacheControl: "no-cache, no-store, max-age=0",
      });
    }
    return { ok: true, apply, pages, assetCount: assets.length, manifestPath, tempDirectory: keepTemp ? temp : undefined, assets: assets.map(({ pageId, blockId, role, placementIndex, sourceBytes, sourceContentType, sourceSha256, checksum, key, deliveryUrl, outputBytes, status }) => ({ pageId, blockId, role, placementIndex, sourceBytes, sourceContentType, sourceSha256, checksum, key, deliveryUrl, outputBytes, status })) };
  } finally {
    if (!keepTemp) await rm(temp, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith("stage-notion-media.ts")) {
  stageNotionMediaPages({ ...parseArgs() }).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
