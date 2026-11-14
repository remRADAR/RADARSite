import type { Metadata } from "next";
import Link from "next/link";
import { readPublishedContent } from "@/lib/content-server";
import { getTrackStories, trackPath } from "@/lib/track-story";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({ title: "TrackStory", description: "Track-centred editorial stories and synchronized listening notes from RADARCharts.", path: "/radarmusic/tracks" });

export default async function TrackStoryIndex() {
  const tracks = getTrackStories(await readPublishedContent());
  return <main className="pt-14"><header className="border-b-2 border-ink px-5 pb-14 pt-20 md:px-10 md:pt-28"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(03 / TrackStory)</p><h1 className="mt-5 display text-[clamp(3rem,12vw,11rem)] leading-[.82]">Listen<br /><span className="text-flare">closer.</span></h1><p className="mt-8 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-widest text-muted-foreground">Tracks are reusable editorial entities: artists, releases, context, credits, sources, and StorySync cards in one place.</p></header><div className="grid border-b-2 border-ink md:grid-cols-2">{tracks.map((track, index) => <Link key={track.slug} href={trackPath(track)} className={`group border-b-2 border-ink p-6 transition-colors hover:bg-flare md:p-10 ${index % 2 === 0 ? "md:border-r-2" : ""}`}><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{track.artistName} / {track.storySyncCards.length} cards</p><h2 className="mt-20 display text-[clamp(2.4rem,8vw,6rem)] leading-[.86]">{track.title}<span className="text-flare group-hover:text-ink">.</span></h2><p className="mt-6 max-w-md font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{track.description || track.background}</p><span className="mt-8 inline-block font-mono text-xs font-bold uppercase tracking-widest">Open TrackStory →</span></Link>)}</div></main>;
}
