import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { publicImageOrigins, publicImageRemotePattern } from "./src/lib/public-media-origin";
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `img-src ${imageSourceTokens} https://radarcharts.net https://www.google-analytics.com https://www.googletagmanager.com`,
      "connect-src 'self' https://api.unsplash.com https://va.vercel-scripts.com https://*.ingest.de.sentry.io https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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
  },
  async redirects() {
    return [
      ...legacyArticleRedirects(),
      { source: "/on-the-radar", destination: "/ontheradar", permanent: true },
      { source: "/on-the-radar/:path*", destination: "/ontheradar/:path*", permanent: true },
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
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});
