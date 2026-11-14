import type { Metadata } from "next";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { PlaylistTunnelGallery } from "@/components/marketing/PlaylistTunnelGallery";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "RADARPlaylists",
  description: "RADARPlaylists — playlist covers from RADARMusic.",
  path: "/radarmusic/artists",
});

export default function PlaylistsPage() {
  return (
    <>
      <ArchiveStructuredData
        name="RADARPlaylists"
        description="RADARPlaylists — playlist covers from RADARMusic."
        path="/radarmusic/artists"
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "RADARMusic", path: "/radarmusic" },
          { name: "RADARPlaylists", path: "/radarmusic/artists" },
        ]}
      />
      <PlaylistTunnelGallery />
    </>
  );
}
