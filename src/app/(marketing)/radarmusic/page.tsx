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
      {/* Mobile: no extra top padding, so the sky fills the first screen edge to edge. */}
      <div className="md:pt-14">
        <RadarMusicSky />
      </div>
    </>
  );
}
