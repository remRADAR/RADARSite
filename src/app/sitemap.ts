import type { MetadataRoute } from "next";
import { readPublicContent } from "@/lib/content-server";
import { absoluteUrl } from "@/lib/seo";
import { caseStudies } from "@/lib/case-studies";
export const revalidate = 3600;
const recentEditorialPaths = [
  "/ontheradar/articles/styling-is-choosing-life-with-aye-lawa-feat-wyza",
  "/ontheradar/articles/telman-releases-if-not-god-a-bold-gospel-drill-anthem",
  "/ontheradar/articles/tulapro-doubles-down-on-his-lifestyle-with-badboy-ii",
  "/ontheradar/articles/gande-is-breaking-boundaries-with-insta-babe",
];
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, artists, events, magazine, radarProjects, releases } = await readPublicContent();
  const routes = ["/", "/radarmusic", "/radarmusic/artists", "/radarmusic/releases", "/ontheradar", "/ontheradar/articles", "/ontheradar/magazine", "/ontheradar/projects", "/ontheradar/events", "/work", "/about", "/about/our-story", "/about/ecosystem"];
  const date = (item: unknown) => { const record = item && typeof item === "object" ? item as Record<string, unknown> : {}; const raw = record.updatedAt || record.publishedAt || record.date || record.year; return raw && Number.isFinite(Date.parse(String(raw))) ? new Date(String(raw)) : undefined; };
  const entry = (path: string, item?: unknown) => ({ url: absoluteUrl(path), ...(date(item) ? { lastModified: date(item) } : {}) });
  const articleEntries = articles.filter((item) => (item as { noindex?: boolean }).noindex !== true).map((item) => entry(`/ontheradar/articles/${item.slug}`, item));
  const articleUrls = new Set(articleEntries.map((item) => item.url));
  const recentFallbackEntries = recentEditorialPaths.filter((path) => !articleUrls.has(absoluteUrl(path))).map((path) => entry(path));
  return [...routes.map((route) => entry(route)), ...artists.map((item) => entry(`/radarmusic/artists/${item.slug}`, item)), ...releases.map((item) => entry(`/radarmusic/releases/${item.slug}`, item)), ...articleEntries, ...recentFallbackEntries, ...magazine.map((item) => entry(`/ontheradar/magazine/${item.slug}`, item)), ...radarProjects.map((item) => entry(`/ontheradar/projects/${item.slug}`, item)), ...events.map((item) => entry(`/ontheradar/events/${item.slug}`, item)), ...caseStudies.filter((item) => item.slug !== "luna-vale-first-light").map((item) => entry(`/work/${item.slug}`, item))];
}
