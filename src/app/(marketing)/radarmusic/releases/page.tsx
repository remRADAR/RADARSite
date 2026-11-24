import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Curated Playlists",
  description: "Curated playlists of notable releases and new music surfaced by RADARCharts.",
  path: "/radarmusic/releases",
});

// TEMPORARY: the Releases fallback opens the shared playlist pod while the
// curated releases view is rebuilt. Restore the editorial index from git
// history (revert of the moon landing commit) when the new view lands.
export default function ReleasesPage() {
  return <RadarPlaylistsExperience source="releases" />;
}
