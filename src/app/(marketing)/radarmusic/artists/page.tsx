import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Editorial Playlists",
  description: "A live RADAR Music player with editorial playlists curated by the official remRADAR Spotify profile.",
  path: "/radarmusic/artists",
});

// Moon orbit fallback: shared playlist pod. Passes source="editorial" so the
// pod labels itself as the editorial playlists signal. This will receive the
// curated editorial playlist feed first (TEMPORARY shared pod).
export default function EditorialPlaylistsPage() {
  return <RadarPlaylistsExperience source="editorial" />;
}
