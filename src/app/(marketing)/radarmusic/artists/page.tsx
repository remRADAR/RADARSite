import type { Metadata } from "next";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { PlaylistTunnelGallery } from "@/components/marketing/PlaylistTunnelGallery";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Playlists",
  description: "Enter the RADARMusic playlist tunnel: an immersive archive of covers moving through the signal.",
  path: "/radarmusic/artists",
});

export default function PlaylistsPage() {
  return (
    <>
      <ArchiveStructuredData
        name="RADARMusic Playlists"
        description="An immersive RADARMusic playlist-cover archive moving through the signal."
        path="/radarmusic/artists"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "RADARMusic", path: "/radarmusic" },
          { name: "Playlists", path: "/radarmusic/artists" },
        ]}
      />
      <PlaylistTunnelGallery />
    </>
  );
}
