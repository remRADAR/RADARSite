import { NextRequest, NextResponse } from "next/server";
import { readCloudflareContentState, writeCloudflareContentState, createCloudflareContentState, isCloudflareConditionalWriteConflict } from "@/lib/cloudflare-content-store";
import { putMediaObject } from "@/lib/media-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One-time media import for a single article record.
 *
 * `eze-a-new-name-a-deeper-connection-and-a-return-to-music` was published with
 * no images at all: its stored `bodyHtml` carried no <img> elements and
 * `imageUrl`/`featuredImage` were empty strings. The four images that exist on
 * the Notion source page were therefore never imported into our storage.
 *
 * This route imports them properly:
 *   1. accepts the image bytes (base64) for the article,
 *   2. stores each one in the site's own R2 bucket via putMediaObject,
 *   3. rewrites the one article record to point at those permanent URLs,
 *      using the same compare-and-swap write the publish path uses.
 *
 * It is idempotent and touches no other record.
 *
 * Auth: `Authorization: Bearer <token>`.
 * Remove this route once the import has been applied.
 */

const PATCH_TOKEN = "eze-media-patch-2026-11-27-7f3c1a9e";
const SLUG = "eze-a-new-name-a-deeper-connection-and-a-return-to-music";

type IncomingImage = { key: string; base64: string; contentType?: string; alt?: string };

const PLACEMENT: Array<{ key: string; anchor: string; alt: string }> = [
  {
    key: "inline-1",
    anchor: "Eze began reconsidering the relationship between heritage, identity and creative expression.</p>",
    alt: "Eze, formerly known as Vuga Kvngz, photographed ahead of his return to music",
  },
  {
    key: "inline-2",
    anchor: "adds another layer to an identity that connects cultural roots with cross-cultural references.</p>",
    alt: "Eze visual identity mark inspired by Nsibidi",
  },
  {
    key: "inline-3",
    anchor: "but as evolving beyond that chapter.\u201d</p>",
    alt: "Eze in a reflective portrait for the Sabbatical Flow chapter",
  },
];

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function authorized(request: NextRequest) {
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  return supplied === PATCH_TOKEN;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return json({ error: "unauthorized" }, { status: 401 });
  const snapshot = await readCloudflareContentState();
  if (!snapshot) return json({ error: "content store unavailable" }, { status: 503 });
  const content = snapshot.state.content as { articles?: Array<Record<string, unknown>> };
  const record = content.articles?.find((item) => item.slug === SLUG);
  if (!record) return json({ error: "article not found" }, { status: 404 });
  const body = typeof record.bodyHtml === "string" ? record.bodyHtml : "";
  return json({
    ok: true,
    slug: SLUG,
    imageCount: (body.match(/<img/g) || []).length,
    imageUrl: record.imageUrl,
    featuredImage: record.featuredImage,
    sources: Array.from(body.matchAll(/src="([^"]+)"/g)).map((match) => match[1]),
  });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return json({ error: "unauthorized" }, { status: 401 });

  let payload: { images?: IncomingImage[] } = {};
  try {
    payload = await request.json();
  } catch {
    return json({ error: "body must be JSON: { images: [{key, base64, contentType, alt}] }" }, { status: 400 });
  }
  const images = Array.isArray(payload.images) ? payload.images : [];
  if (!images.length) return json({ error: "no images supplied" }, { status: 400 });

  // 1. Store every image in our own bucket.
  const urls: Record<string, string> = {};
  const stored: Array<{ key: string; url: string; bytes: number }> = [];
  const failed: Array<{ key: string; error: string }> = [];

  for (const image of images) {
    try {
      const bytes = Buffer.from(image.base64, "base64");
      if (!bytes.length) throw new Error("empty image payload");
      if (bytes.length > 8 * 1024 * 1024) throw new Error("image exceeds 8MB");
      const result = await putMediaObject({
        key: `editorial/eze/${image.key}.webp`,
        body: bytes,
        contentType: image.contentType || "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
      });
      urls[image.key] = result.url;
      stored.push({ key: image.key, url: result.url, bytes: bytes.length });
    } catch (error) {
      failed.push({ key: image.key, error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (failed.length) return json({ ok: false, stored, failed }, { status: 502 });

  // 2. Rewrite the one article record.
  const snapshot = await readCloudflareContentState();
  if (!snapshot) return json({ error: "content store unavailable", stored }, { status: 503 });

  const content = snapshot.state.content as { articles?: Array<Record<string, unknown>> };
  const articles = content.articles;
  if (!Array.isArray(articles)) return json({ error: "unexpected content shape", stored }, { status: 500 });

  const record = articles.find((item) => item.slug === SLUG);
  if (!record) return json({ error: "article not found", slug: SLUG, stored }, { status: 404 });

  let body = typeof record.bodyHtml === "string" ? record.bodyHtml : "";
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const placement of PLACEMENT) {
    const url = urls[placement.key];
    if (!url) {
      skipped.push(`${placement.key} (not uploaded)`);
      continue;
    }
    if (body.includes(url)) {
      skipped.push(`${placement.key} (already present)`);
      continue;
    }
    if (!body.includes(placement.anchor)) {
      skipped.push(`${placement.key} (anchor not found)`);
      continue;
    }
    const markup = `<figure><img loading="lazy" src="${url}" alt="${placement.alt}"></figure>`;
    body = body.replace(placement.anchor, placement.anchor + markup);
    applied.push(placement.key);
  }

  const coverUrl = urls.cover;
  record.bodyHtml = body;
  if (coverUrl) {
    record.imageUrl = coverUrl;
    record.featuredImage = coverUrl;
    record.featuredImageAlt = "Eze \u2014 A New Name, A Deeper Connection, and a Return to Music";
    record.socialImage = coverUrl;
  }

  const nextState = createCloudflareContentState(content, snapshot.state.relationships);
  try {
    await writeCloudflareContentState(nextState, snapshot.etag);
  } catch (error) {
    if (isCloudflareConditionalWriteConflict(error)) {
      return json({ error: "concurrent write, retry", stored }, { status: 409 });
    }
    throw error;
  }

  return json({
    ok: true,
    slug: SLUG,
    stored,
    applied,
    skipped,
    imageCount: (body.match(/<img/g) || []).length,
    imageUrl: record.imageUrl,
    revision: nextState.revision,
  });
}
