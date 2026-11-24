import type { Metadata } from "next";
import { DimbBabyOpener } from "@/components/marketing/DimbBabyOpener";
import { DimbLogoOpener } from "@/components/marketing/DimbLogoOpener";
import { DimbPodcast } from "@/components/marketing/DimbPodcast";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "DuMb",
  description:
    "DuMb, the RADARMusic podcast: Deep in my bones. Conversations, track stories, and the records that never left us.",
  path: "/radarmusic/podcast",
});

export default function PodcastPage() {
  return (
    <main>
      {/* The page is now sitemap-listed (S-3), so it needs a single h1 for
          heading hierarchy; the visual title is rendered by the openers. */}
      <h1 className="sr-only">DuMb — the RADARMusic podcast</h1>
      <DimbBabyOpener />
      <DimbLogoOpener />
      <DimbPodcast />
    </main>
  );
}
