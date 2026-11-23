import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "TrackStory",
  description: "Track-centred editorial stories and synchronized listening notes from RADARCharts.",
  path: "/radarmusic/tracks",
});

// TEMPORARY: the Tracks fallback opens the shared playlist player pod while
// the TrackStory index view is rebuilt. Restore the editorial index from git
// history (revert of the moon landing commit) when the new view lands.
export default function TracksPage() {
  return <RadarPlaylistsExperience />;
}
