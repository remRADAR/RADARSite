import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/api/", "/dashboard", "/dashboard/", "/projects", "/projects/", "/briefs", "/briefs/", "/login"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
