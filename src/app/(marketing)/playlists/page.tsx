import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";

export const metadata: Metadata = {
  title: "RADARPlaylists — RADARCharts by REM",
  description: "RADAR Music on YouTube — new voices, essential records, and the songs moving culture forward.",
  alternates: { canonical: "/playlists" },
};

export default function PlaylistsPage() {
  return <RadarPlaylistsExperience />;
}
