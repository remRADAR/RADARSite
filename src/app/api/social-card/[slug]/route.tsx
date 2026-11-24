import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { readPublishedArticleBySlug } from "@/lib/content-server";
import { normalizeEditorialRecord } from "@/lib/editorial-normalization";
import { getEffectiveImageUrl } from "@/lib/effective-image-url";
import { publicSiteUrl } from "@/lib/public-site";

export const runtime = "nodejs";
export const revalidate = 3600;

const FALLBACK_CARD = "/social/radar-global-card.png";

function safeImageUrl(source: string | undefined) {
  const candidate = getEffectiveImageUrl(source || "").effectiveUrl;
  try {
    const url = new URL(candidate, publicSiteUrl());
    return url.protocol === "https:" ? url.toString() : `${publicSiteUrl()}/radar-logo.webp`;
  } catch {
    return `${publicSiteUrl()}/radar-logo.webp`;
  }
}

function titleSize(title: string) {
  if (title.length > 90) return 32;
  if (title.length > 58) return 42;
  return 56;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await readPublishedArticleBySlug(decodeURIComponent(slug));
  if (!item) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  const record = normalizeEditorialRecord(item);
  const title = record.title || "RADARCharts";
  const excerptSource = record.excerpt || record.metaDescription || "";
  const excerpt = excerptSource.length > 110 ? `${excerptSource.slice(0, 109).trimEnd()}\u2026` : excerptSource;
  const imageUrl = safeImageUrl(record.imageUrl || record.featuredImage);
  const logoUrl = `${publicSiteUrl()}/radar-logo.webp`;

  try {
    return await renderCard({ title, excerpt, imageUrl, logoUrl });
  } catch (error) {
    // A card is a social-preview nicety, never a reason to fail the request.
    // Satori/resvg can exceed the Worker CPU budget on a heavy source image, so
    // retry once without the photograph: the typographic card still carries the
    // headline and brand, and costs a fraction of the CPU.
    console.error("[social-card] render failed; retrying without source image", {
      slug,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
    });
    try {
      return await renderCard({ title, excerpt, imageUrl: "", logoUrl });
    } catch (fallbackError) {
      console.error("[social-card] fallback render failed; serving static brand card", {
        slug,
        name: fallbackError instanceof Error ? fallbackError.name : "UnknownError",
        message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      return NextResponse.redirect(`${publicSiteUrl()}${FALLBACK_CARD}`, 302);
    }
  }
}

async function renderCard({ title, excerpt, imageUrl, logoUrl }: { title: string; excerpt: string; imageUrl: string; logoUrl: string }) {
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
      }}
    >
      {imageUrl ? <img src={imageUrl} alt="" width="1200" height="630" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(8,8,8,.96) 0%, rgba(8,8,8,.82) 46%, rgba(8,8,8,.18) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(0deg, rgba(8,8,8,.92) 0%, transparent 45%)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", padding: "54px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <img src={logoUrl} alt="RADARCharts" width="210" height="60" style={{ width: "210px", height: "60px", objectFit: "contain" }} />
            <div style={{ display: "flex", color: "#ff3b30", fontSize: 22, fontWeight: 700, letterSpacing: "3px" }}>ON THE RADAR</div>
          </div>
          <div style={{ display: "flex", color: "#f4f1ea", fontSize: 18, fontWeight: 700, letterSpacing: "2px" }}>RADARCHARTS.NET</div>
        </div>
        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", maxWidth: "760px", marginTop: "18px", marginBottom: "18px" }}>
          <div style={{ display: "flex", color: "#ff3b30", fontSize: 20, fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", marginBottom: "18px" }}>RADARARTICLE</div>
          <div style={{ display: "flex", fontSize: titleSize(title), lineHeight: 1.02, fontWeight: 900, letterSpacing: "-1.5px", textTransform: "uppercase" }}>{title}</div>
          {excerpt ? <div style={{ display: "flex", marginTop: "16px", maxWidth: "700px", color: "#d6d1c8", fontSize: 16, lineHeight: 1.2, letterSpacing: "0.2px" }}>{excerpt}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%", borderTop: "2px solid #f4f1ea", paddingTop: "18px", color: "#f4f1ea", fontSize: 18, fontWeight: 700, letterSpacing: "2px" }}>
          <div style={{ display: "flex" }}>RADARCharts by REM</div>
          <div style={{ display: "flex", color: "#ff3b30" }}>PROTECTING THE MUSIC</div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
