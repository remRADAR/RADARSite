import type { CmsRecord } from "@/lib/content-server";

export const ARTICLES_PER_PAGE = 24;
export const UNCATEGORIZED_LABEL = "Uncategorized";

export function isCurrentRadarchartsArticle(record: unknown) {
  const value = record && typeof record === "object" ? record as { sourceUrl?: unknown; sourceProvider?: unknown } : {};
  if (value.sourceProvider === "radarcharts") return true;
  try {
    return new URL(typeof value.sourceUrl === "string" ? value.sourceUrl : "https://invalid.local").hostname.toLowerCase().endsWith("radarcharts.net");
  } catch {
    return false;
  }
}

export function articleCategories(record: Pick<CmsRecord, "categories"> & { section?: string }) {
  const values = (record.categories || []).map((value) => value.trim()).filter(Boolean);
  if (!values.length && record.section?.toLowerCase() === "radar-articles") return ["RADARArticles"];
  return values.length ? [...new Set(values)] : [UNCATEGORIZED_LABEL];
}

export function categorySlug(label: string) {
  return encodeURIComponent(label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
}

export function categoryLabelFromSlug(slug: string, labels: string[]) {
  const decoded = decodeURIComponent(slug);
  return labels.find((label) => categorySlug(label) === decoded) || null;
}

export function articleTimestamp(record: Pick<CmsRecord, "publishedAt" | "date">) {
  const parsed = Date.parse(record.publishedAt || record.date || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortArticlesCurrentFirst<T extends CmsRecord>(articles: T[]) {
  return [...articles].sort((a, b) => {
    const sourceOrder = Number(isCurrentRadarchartsArticle(b)) - Number(isCurrentRadarchartsArticle(a));
    return sourceOrder || articleTimestamp(b) - articleTimestamp(a);
  });
}

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / ARTICLES_PER_PAGE));
}
