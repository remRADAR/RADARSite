import type { MetadataRoute } from "next";
import { readPublicContent } from "@/lib/content-server";
import { absoluteUrl } from "@/lib/seo";
import { caseStudies } from "@/lib/case-studies";
import { articleCategories, categorySlug, pageCount } from "@/lib/article-taxonomy";
import { EDITORIAL_ARCHIVE_PAGE_SIZE, recordsForEditorialType } from "@/lib/editorial-archives";
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, artists, events, magazine, radarProjects, releases } = await readPublicContent();
  const routes = ["/", "/radarmusic", "/radarmusic/artists", "/radarmusic/releases", "/ontheradar", "/ontheradar/articles", "/ontheradar/magazine", "/ontheradar/projects", "/ontheradar/events", "/work", "/about", "/about/our-story", "/about/ecosystem", "/motherland", "/privacy", "/terms"];
  const date = (item: unknown) => { const record = item && typeof item === "object" ? item as Record<string, unknown> : {}; const raw = record.updatedAt || record.publishedAt || record.date || record.year; return raw && Number.isFinite(Date.parse(String(raw))) ? new Date(String(raw)) : undefined; };
  const entry = (path: string, item?: unknown) => ({ url: absoluteUrl(path), ...(date(item) ? { lastModified: date(item) } : {}) });
  const articleEntries = articles.filter((item) => (item as { noindex?: boolean }).noindex !== true).map((item) => entry(`/ontheradar/articles/${item.slug}`, item));
  const editorialArchives = ["Press", "Spotlight"].flatMap((type) => {
    const total = Math.max(1, Math.ceil(recordsForEditorialType(articles, type as "Press" | "Spotlight").length / EDITORIAL_ARCHIVE_PAGE_SIZE));
    return Array.from({ length: total }, (_, index) => entry(`/ontheradar/articles/${type.toLowerCase()}/page/${index + 1}`));
  });
  const categoryArchives = [...new Set(articles.flatMap(articleCategories))].flatMap((label) => {
    const total = pageCount(articles.filter((article) => articleCategories(article).some((value) => value.toLowerCase() === label.toLowerCase())).length);
    return Array.from({ length: total }, (_, index) => entry(`/ontheradar/articles/category/${categorySlug(label)}/page/${index + 1}`));
  });
  const allEntries = [...routes.map((route) => entry(route)), ...editorialArchives, ...categoryArchives, ...artists.map((item) => entry(`/radarmusic/artists/${item.slug}`, item)), ...releases.map((item) => entry(`/radarmusic/releases/${item.slug}`, item)), ...articleEntries, ...magazine.map((item) => entry(`/ontheradar/magazine/${item.slug}`, item)), ...radarProjects.map((item) => entry(`/ontheradar/projects/${item.slug}`, item)), ...events.map((item) => entry(`/ontheradar/events/${item.slug}`, item)), ...caseStudies.filter((item) => item.slug !== "luna-vale-first-light").map((item) => entry(`/work/${item.slug}`, item))];
  return [...new Map(allEntries.map((item) => [item.url, item])).values()];
}
