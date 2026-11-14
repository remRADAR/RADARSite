import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({ title: "RADARMusic", description: "Artists and releases with something to say, curated by RADARCharts.", path: "/radarmusic" });

import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { PlaylistTunnelGallery } from "@/components/marketing/PlaylistTunnelGallery";

export default function RadarMusicPage() {
  return (
    <>
      <ArchiveStructuredData name="RADARMusic" description="Playlist covers and music stories moving through the RADAR archive." path="/radarmusic" breadcrumbs={[{ name: "Home", path: "/" }, { name: "RADARMusic", path: "/radarmusic" }]} />
      <PlaylistTunnelGallery />
    </>
  );
}
