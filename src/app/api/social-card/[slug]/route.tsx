/* eslint-disable @next/next/no-img-element -- This route renders an OG image with ImageResponse (Satori), which requires raw <img> elements; next/image is not supported in OG rendering. */
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { readPublishedArticleBySlug } from "@/lib/content-server";
import { normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";
import { publicSiteUrl } from "@/lib/public-site";
import { editorialAuthorProfile } from "@/lib/editorial-authors";
import cardManifest from "@/data/social-card-manifest";

export const runtime = "nodejs";
export const revalidate = 3600;

function safeImageUrl(source: string | undefined) {
  const candidate = getEffectiveImageUrl(source || "").effectiveUrl;
  try {
    const url = new URL(candidate, publicSiteUrl());
    return url.protocol === "https:" ? url.toString() : `${publicSiteUrl()}/radar-logo.webp`;
  } catch {
    return `${publicSiteUrl()}/radar-logo.webp`;
  }
}

/**
 * Prefer the committed 1200x630 derivative over the article's full-size source.
 *
 * The source artwork is routinely 3000-6000px wide. The 1200x630 JPEG derivative
 * prevents a Worker-side multi-megapixel decode and uses an image format Satori
 * reliably renders (the former WebP derivatives yielded artwork-free cards).
 *
 * Falls back to the full-size source when no derivative exists (a newly
 * published article, or a source image that could not be fetched), so the card
 * still renders rather than 404ing.
 */
function cardImageUrl(slug: string, source: string | undefined) {
  const entry = (cardManifest as { cards?: Record<string, { file?: string }> }).cards?.[slug];
  if (entry?.file) return `${publicSiteUrl()}/social/cards/${entry.file}`;
  return safeImageUrl(source);
}

type WorkerAssetFetcher = { fetch(request: Request): Promise<Response> };

/**
 * Satori's URL fetch for Worker-hosted static files can silently omit images.
 * Read same-origin assets through the configured Cloudflare ASSETS binding,
 * then pass explicit image bytes to ImageResponse instead of a URL to resolve.
 */
async function imageSourceForRenderer(source: string) {
  const url = new URL(source);
  let response: Response | undefined;

  if (url.origin === new URL(publicSiteUrl()).origin) {
    try {
      const workerModule: { env: unknown } = await import("cloudflare:workers");
      const environment = workerModule.env as { ASSETS?: WorkerAssetFetcher };
      if (environment.ASSETS) {
        const assetResponse = await environment.ASSETS.fetch(new Request(url));
        if (assetResponse.ok) response = assetResponse;
      }
    } catch {
      // Node.js dev/build and deployments without the binding use fetch below.
    }
  }

  if (!response) {
    try {
      response = await fetch(url);
    } catch {
      return url.toString();
    }
  }

  if (!response.ok) return url.toString();
  const contentType = response.headers.get("content-type")?.split(";")[0];
  if (!contentType?.startsWith("image/")) return url.toString();

  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

const CARD_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function titleSize(title: string) {
  if (title.length > 90) return 32;
  if (title.length > 58) return 42;
  return 56;
}

/**
 * HEAD must not render.
 *
 * Next/Vinext fall back to GET when a route exports no HEAD handler, so every
 * crawler HEAD ran the full satori + resvg pipeline and only then dropped the
 * body -- the most expensive possible way to answer a question that needs no
 * pixels, and the direct cause of the 1102 on HEAD while GET returned 200.
 * Answer from the cheap article lookup and report the same cache policy so
 * crawlers cache the URL either way.
 */
export async function HEAD(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await readPublishedArticleBySlug(decodeURIComponent(slug));
  if (!item) return new Response(null, { status: 404 });
  return new Response(null, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": CARD_CACHE_CONTROL },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  // Single-article lookup: readPublishedContent() normalises all 342 articles to
  // keep one, which blows the Worker CPU budget on a cold render (Cloudflare 1102).
  const item = await readPublishedArticleBySlug(decodedSlug);
  if (!item) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const record = normalizeEditorialRecord(item);
  const title = record.title || "RADARCharts";
  const excerptSource = record.excerpt || record.metaDescription || "";
  const excerpt = excerptSource.length > 110 ? `${excerptSource.slice(0, 109).trimEnd()}\u2026` : excerptSource;
  const imageUrl = cardImageUrl(decodedSlug, record.imageUrl || record.featuredImage);
  const logoUrl = `${publicSiteUrl()}/radar-logo.webp`;
  const stayAktivUrl = `${publicSiteUrl()}/brand/stayaktiv-logo.png`;
  const byline = editorialAuthorProfile(record).byline;
  const [imageSource, logoSource, stayAktivSource] = await Promise.all([
    imageSourceForRenderer(imageUrl),
    imageSourceForRenderer(logoUrl),
    imageSourceForRenderer(stayAktivUrl),
  ]);

  return new ImageResponse(
    <div
      style={{
        background: "#080808",
        color: "#f4f1ea",
        display: "flex",
        height: "100%",
        position: "relative",
        width: "100%",
        fontFamily: "Arial, Helvetica, sans-serif",
        overflow: "hidden",
        // White outline frames the whole card. The design carries no internal
        // rules: the artwork and the write-up sit inside one bordered field.
        border: "10px solid #ffffff",
        boxSizing: "border-box",
      }}
    >
      <img src={imageSource} alt="" width="1200" height="630" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(8,8,8,.96) 0%, rgba(8,8,8,.82) 46%, rgba(8,8,8,.18) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(0deg, rgba(8,8,8,.92) 0%, transparent 45%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "54px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <img src={logoSource} alt="RADARCharts" width="210" height="60" style={{ width: "210px", height: "60px", objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", color: "#f4f1ea", fontSize: 18, fontWeight: 700, letterSpacing: "2px" }}>RADARCHARTS.NET</div>
        </div>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", maxWidth: "760px", marginTop: "18px", marginBottom: "18px" }}>
          <div style={{ display: "flex", color: "#ff3b30", fontSize: 20, fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "18px" }}>RADARARTICLE</div>
          <div style={{ display: "flex", fontSize: titleSize(title), lineHeight: 1.02, fontWeight: 900, letterSpacing: "-1.5px", textTransform: "uppercase" }}>{title}</div>
          {excerpt ? <div style={{ display: "flex", marginTop: "16px", maxWidth: "700px", color: "#d6d1c8", fontSize: 16, lineHeight: 1.2, letterSpacing: "0.2px" }}>{excerpt}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%", color: "#f4f1ea", fontSize: 18, fontWeight: 700, letterSpacing: "2px" }}>
          <div style={{ display: "flex" }}>{byline}</div>
          <img src={stayAktivSource} alt="stayAKTiV" width="96" height="96" style={{ width: "96px", height: "96px", objectFit: "contain" }} />
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": CARD_CACHE_CONTROL } },
  );
}
