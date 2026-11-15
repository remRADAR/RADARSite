import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";

export const metadata: Metadata = {
  title: "RADARPlaylists — RADARCharts by REM",
  description: "A live RADAR Music player with playlist artwork curated by the official remRADAR Spotify profile.",
  alternates: { canonical: "/playlists" },
};

export default function RadarPlaylistsPage() {
  return <RadarPlaylistsExperience />;
}
