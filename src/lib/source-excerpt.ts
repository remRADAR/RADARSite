import type { CmsRecord } from "@/lib/content-server";
import { articlePath } from "@/lib/editorial-normalization";
import { absoluteUrl } from "@/lib/seo";

export type ArticleSourceExcerpt = {
  sourceArticleId?: string;
  sourceArticleUrl: string;
  sourceArticleTitle: string;
  sourcePublishedAt?: string;
  sourceUpdatedAt?: string;
  sourceAuthor?: string;
  excerpt: string;
  artistId?: string;
  artistName?: string;
  songId?: string;
  songName?: string;
  releaseId?: string;
  releaseName?: string;
  attribution: string;
  surface?: string;
};

function text(value: unknown, max: number) { return typeof value === "string" ? value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }

export function buildArticleSourceExcerpt(record: CmsRecord): ArticleSourceExcerpt | null {
  const excerpt = text(record.sourceExcerpt, 360);
  if (!excerpt) return null;
  const title = text(record.title || record.name, 300);
  const path = articlePath(record);
  return {
    sourceArticleId: text(record.id || record.sourceId, 120) || undefined,
    sourceArticleUrl: absoluteUrl(text(record.canonicalUrl, 2000) || path),
    sourceArticleTitle: title,
    sourcePublishedAt: text(record.publishedAt || record.date, 100) || undefined,
    sourceUpdatedAt: text(record.sourceModifiedAt || record.updatedAt, 100) || undefined,
    sourceAuthor: text(record.author, 200) || undefined,
    excerpt,
    artistId: text(record.sourceArtistId, 120) || undefined,
    artistName: text(record.sourceArtistName, 200) || undefined,
    songId: text(record.sourceSongId, 120) || undefined,
    songName: text(record.sourceSongName, 200) || undefined,
    releaseId: text(record.sourceReleaseId, 120) || undefined,
    releaseName: text(record.sourceReleaseName, 200) || undefined,
    attribution: "Excerpt from RADAR editorial",
    surface: text(record.sourceExcerptSurface, 120) || undefined,
  };
}
