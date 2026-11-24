import type { Metadata } from "next";
import { DimbBabyOpener } from "@/components/marketing/DimbBabyOpener";
import { DimbLogoOpener } from "@/components/marketing/DimbLogoOpener";
import { DimbPodcast } from "@/components/marketing/DimbPodcast";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "DIMB",
  description:
    "DIMB, the RADARMusic podcast: Deep in my bones. Conversations, track stories, and the records that never left us.",
  path: "/radarmusic/podcast",
});

export default function PodcastPage() {
  return (
    <main>
      <DimbBabyOpener />
      <DimbLogoOpener />
      <DimbPodcast />
    </main>
  );
}
