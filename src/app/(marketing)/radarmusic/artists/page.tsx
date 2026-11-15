import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";

export const metadata: Metadata = {
  title: "RADARPlaylists — RADARMusic",
  description: "RADAR playlists, played through the RADAR iPod.",
  alternates: { canonical: "/radarmusic/artists" },
};

export default function RadarPlaylistsPage() {
  return <RadarPlaylistsExperience />;
}
