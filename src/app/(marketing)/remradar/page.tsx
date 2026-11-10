import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "RemRADAR",
  description: "The story of remRADAR.",
  path: "/remradar",
});

export default function RemRadarPage() {
  return null;
}
