import type { MetadataRoute } from "next";
import { readPublicContent } from "@/lib/content-server";
import { articleCategories, categorySlug, pageCount } from "@/lib/article-taxonomy";
import { publicSiteUrl } from "@/lib/public-site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, artists, events, magazine, radarProjects, releases } = await readPublicContent();
  const base = publicSiteUrl();
  const routes = ["/", "/radarmusic", "/radarmusic/artists", "/radarmusic/releases", "/ontheradar", "/ontheradar/articles", "/ontheradar/magazine", "/ontheradar/projects", "/ontheradar/events", "/about", "/about/our-story", "/about/ecosystem"];
  const categoryMap = new Map<string, number>();
  for (const article of articles) for (const category of articleCategories(article)) categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
  const categoryRoutes = [...categoryMap.entries()].flatMap(([category, count]) => Array.from({ length: pageCount(count) }, (_, index) => `/ontheradar/articles/category/${categorySlug(category)}/page/${index + 1}`));
  const itemRoutes = [
    ...artists.map((item) => `/radarmusic/artists/${item.slug}`),
    ...releases.map((item) => `/radarmusic/releases/${item.slug}`),
    ...articles.map((item) => `/ontheradar/articles/${item.slug}`),
    ...magazine.map((item) => `/ontheradar/magazine/${item.slug}`),
    ...radarProjects.map((item) => `/ontheradar/projects/${item.slug}`),
    ...events.map((item) => `/ontheradar/events/${item.slug}`),
  ];
  return [...new Set([...routes, ...categoryRoutes, ...itemRoutes])].map((route) => ({ url: `${base}${route}`, lastModified: new Date() }));
}
