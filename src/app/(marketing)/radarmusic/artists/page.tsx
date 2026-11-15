import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";

export const metadata: Metadata = {
  title: "RADARPlaylists — RADARCharts by REM",
  description: "RADAR music on YouTube, with curated playlists from the remRADAR Spotify profile.",
  alternates: { canonical: "/playlists" },
};

export default function RadarPlaylistsPage() {
  return <RadarPlaylistsExperience />;
}
