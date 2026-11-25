import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { publicImageOrigins, publicImageRemotePattern } from "./src/lib/public-media-origin";
import { buildScriptSrcDirective } from "./src/lib/csp";
import mergedContentSnapshot from "./src/data/merged-content.json";

const imageOrigins = publicImageOrigins(process.env.R2_PUBLIC_BASE_URL);
const remotePatterns = imageOrigins.map(publicImageRemotePattern);
const imageSourceTokens = ["'self'", "data:", "blob:", ...imageOrigins].join(" ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "object-src 'none'",
      `script-src ${buildScriptSrcDirective()}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src ${imageSourceTokens} https://radarcharts.net https://drive.google.com https://lh3.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com`,
      "connect-src 'self' https://api.unsplash.com https://*.ingest.de.sentry.io https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://www.instagram.com https://instagram.com https://w.soundcloud.com https://soundcloud.com https://spline.design https://*.spline.design",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), compute-pressure=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

function legacyArticleRedirects() {
  const redirects = new Map<string, { source: string; destination: string; permanent: true }>();
  const queryRedirects = new Map<string, { source: string; destination: string; permanent: true; has: [{ type: "query"; key: string; value: string }] }>();
  for (const record of mergedContentSnapshot.articles || []) {
    const slug = typeof record.slug === "string" ? record.slug.trim() : "";
    const sourceUrl = typeof record.sourceUrl === "string" ? record.sourceUrl : "";
    if (!slug || !sourceUrl) continue;
    try {
      const url = new URL(sourceUrl);
      if (url.hostname !== "radarcharts.net" && url.hostname !== "www.radarcharts.net") continue;
      const source = url.pathname.replace(/\/+$/, "") || "/";
      const destination = `/ontheradar/articles/${encodeURIComponent(slug)}`;
      redirects.set(source, { source, destination, permanent: true });
      const sourceId = typeof record.sourceId === "string" ? record.sourceId.trim() : "";
      if (sourceId && !queryRedirects.has(sourceId)) queryRedirects.set(sourceId, { source: "/", destination, permanent: true, has: [{ type: "query", key: "p", value: sourceId }] });
    } catch {
      // Invalid source URLs are excluded from routing rather than creating a broad redirect.
    }
  }
  return [...redirects.values(), ...queryRedirects.values()];
}

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  images: {
    remotePatterns,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840, 8192],
    qualities: [75, 100],
  },
  async rewrites() {
    return [
      // The Wiki pages are static documents under public/wiki/.
      // Next.js only serves public files at their exact path, so /wiki would
      // 404 without these rewrites. The pages use absolute asset paths
      // (/radar-logo.webp) and sibling-relative page links, so they render
      // correctly at both the pretty and the .html form of each URL.
      { source: "/wiki", destination: "/wiki/index.html" },
      { source: "/wiki/architecture", destination: "/wiki/architecture.html" },
    ];
  },
  async redirects() {
    return [
      ...legacyArticleRedirects(),
      { source: "/about/our-story", destination: "/remradar", permanent: true },
      { source: "/on-the-radar", destination: "/ontheradar", permanent: true },
      { source: "/on-the-radar/:path*", destination: "/ontheradar/:path*", permanent: true },
      { source: "/ontheradar/discovery", destination: "/ontheradar/articles/spotlight/page/1", permanent: true },
      { source: "/ontheradar/talk-to-us", destination: "/ontheradar/magazine", permanent: true },
      { source: "/ontheradar/motherland", destination: "/motherland", permanent: true },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          ...securityHeaders,
        ],
      },
      { source: "/hero-new/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
      // Social cards are immutable per article revision and are fetched by
      // crawlers in bursts. The blanket /api no-store rule above forced a full
      // satori + resvg render on every request, which intermittently exceeded
      // the Worker CPU budget (Cloudflare 1102). This more specific rule is
      // declared last so it wins, and lets the route's own long-lived cache
      // header stand.
      { source: "/api/social-card/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" }] },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});
