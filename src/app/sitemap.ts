import type { MetadataRoute } from "next";
import { readContent } from "@/lib/content-server";

const base = "https://radarsite-two.vercel.app";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, artists, events, magazine, radarProjects, releases } = await readContent();
  const routes = ["/", "/radarmusic", "/radarmusic/artists", "/radarmusic/releases", "/ontheradar", "/ontheradar/articles", "/ontheradar/magazine", "/ontheradar/projects", "/ontheradar/events", "/about", "/about/our-story", "/about/ecosystem"];
  return [...routes.map((route) => ({ url: `${base}${route}`, lastModified: new Date() })), ...artists.map((item) => ({ url: `${base}/radarmusic/artists/${item.slug}`, lastModified: new Date() })), ...releases.map((item) => ({ url: `${base}/radarmusic/releases/${item.slug}`, lastModified: new Date() })), ...articles.map((item) => ({ url: `${base}/ontheradar/articles/${item.slug}`, lastModified: new Date() })), ...magazine.map((item) => ({ url: `${base}/ontheradar/magazine/${item.slug}`, lastModified: new Date() })), ...radarProjects.map((item) => ({ url: `${base}/ontheradar/projects/${item.slug}`, lastModified: new Date() })), ...events.map((item) => ({ url: `${base}/ontheradar/events/${item.slug}`, lastModified: new Date() }))];
}
