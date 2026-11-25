import type { Metadata } from "next";
import { RadarChartsExperience } from "@/components/marketing/RadarChartsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Charts",
  description: "RADARCharts — the official RADAR Spotify playlists (TOP 10 RADAR, TOP 100 ABUJA, THE GREAT WALL ABUJA), presented in Spotify order, only on radarcharts.net.",
  path: "/radarmusic/charts",
});

// Moon orbit fallback: the charts page. ONE dashboard frame carries all three
// official playlists; the playlist selector updates the frame in place.
export default function RadarChartsPage() {
  return <RadarChartsExperience />;
}
