import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Podcast",
  description: "The RADARMusic podcast: conversations, track stories, and the people moving culture forward.",
  path: "/radarmusic/podcast",
});

// TEMPORARY: the Podcast fallback opens the shared playlist pod while the
// podcast experience is built. The source prop already identifies it so the
// pod can branch to podcast content when it lands.
export default function PodcastPage() {
  return <RadarPlaylistsExperience source="podcast" />;
}
