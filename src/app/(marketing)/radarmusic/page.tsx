import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { MoonLanding } from "@/components/marketing/MoonLanding";
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
      <div className="pt-14">
        <div className="px-4 pt-16 md:px-8 md:pt-20">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(01 / RADARMusic)</p>
          <p className="mt-6 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-widest text-muted-foreground">Editorial playlists, releases, and track-centred stories. Tap the moon to open the signal.</p>
        </div>
        <MoonLanding />
        <nav aria-label="RADARMusic quick links" className="flex flex-wrap gap-x-8 gap-y-2 border-t-2 border-ink px-4 py-6 font-mono text-xs font-bold uppercase tracking-widest md:px-8">
          <Link href="/radarmusic/artists" className="transition-colors hover:text-flare">Editorial Playlists</Link>
          <Link href="/radarmusic/releases" className="transition-colors hover:text-flare">Releases</Link>
          <Link href="/radarmusic/tracks" className="transition-colors hover:text-flare">Tracks</Link>
        </nav>
      </div>
    </>
  );
}
