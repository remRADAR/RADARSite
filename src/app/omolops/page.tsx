import type { Metadata } from "next";
import { ReleaseLinkPanel } from "@/components/marketing/ReleaseLinkPanel";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Omolops — Pre-save",
  description: "Pre-save and streaming links for Omolops by Mamuzo, presented by RADARMusic.",
  path: "/omolops",
  image: "/releases/omolops-cover.jpeg",
});

export default function OmolopsReleasePage() {
  return <ReleaseLinkPanel />;
}
