import type { MetadataRoute } from "next";

const base = "https://radarsite-two.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dashboard", "/projects", "/briefs", "/login"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
