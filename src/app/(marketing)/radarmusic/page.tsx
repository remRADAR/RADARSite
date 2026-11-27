import type { Metadata } from "next";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { RadarMusicSky } from "@/components/marketing/RadarMusicSky";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "RADARMusic",
  description: "Playlists, artists, and releases with something to say, curated by RADARCharts.",
  path: "/radarmusic",
});

export default function RadarMusicPage() {
  return (
    <>
      <ArchiveStructuredData
        name="RADARMusic"
        description="Playlists, artists, and releases with something to say. Enter the music side of the RADAR ecosystem."
        path="/radarmusic"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "RADARMusic", path: "/radarmusic" }]}
      />
      {/* No top spacer: the moon sky begins immediately under the sticky nav, so
          the only black band left is the menu row itself. The sky then fills the
          heading area and the whole top-right corner. */}
      <RadarMusicSky />
    </>
  );
}
