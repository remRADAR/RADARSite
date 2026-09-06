import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/on-the-radar", destination: "/ontheradar", permanent: true },
      { source: "/on-the-radar/:path*", destination: "/ontheradar/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
