import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { readPublishedContent } from "@/lib/content-server";
import { getTrackStories, musicRecordingStructuredData, trackPath } from "@/lib/track-story";
import { StorySyncPlayer } from "@/components/marketing/StorySyncPlayer";
import { StructuredData } from "@/components/StructuredData";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo";

export const dynamicParams = true;
export const revalidate = 3600;

async function findTrack(slug: string) { return getTrackStories(await readPublishedContent()).find((track) => track.slug === slug); }

export async function generateStaticParams() { return getTrackStories(await readPublishedContent()).map((track) => ({ track: track.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> { const { track: slug } = await params; const item = await findTrack(slug); return item ? buildPageMetadata({ title: `${item.title} — TrackStory`, description: item.description || item.background || `StorySync for ${item.title} by ${item.artistName}.`, path: trackPath(item) }) : { title: "TrackStory" }; }

export default async function TrackStoryDetail({ params }: { params: Promise<{ track: string }> }) {
  const { track: slug } = await params;
  const item = await findTrack(slug);
  if (!item) notFound();
  const canonical = absoluteUrl(trackPath(item));
  return <><StructuredData data={musicRecordingStructuredData(item, canonical)} /><main className="pt-14"><header className="grid border-b-2 border-ink md:grid-cols-[1.1fr_.9fr]"><div className="flex min-h-[52svh] flex-col justify-between border-b-2 border-ink p-5 md:border-b-0 md:border-r-2 md:p-10"><Link href="/radarmusic/tracks" className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-flare">← Back to TrackStory</Link><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.artistName}{item.releaseTitle ? ` / ${item.releaseTitle}` : ""}</p><h1 className="mt-5 display text-[clamp(3.5rem,10vw,9rem)] leading-[.82]">{item.title}<span className="text-flare">.</span></h1><p className="mt-8 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">{item.description || item.background}</p></div></div><div className="flex items-end bg-ink p-5 text-paper md:p-10"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-flare">RADAR StorySync</p><p className="mt-5 display text-4xl leading-none md:text-6xl">A listening<br />note in time.</p></div></div></header><div className="grid gap-12 px-5 py-14 md:grid-cols-[.8fr_1.2fr] md:px-10 md:py-24"><aside className="space-y-8"><section><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">The context</p><p className="mt-4 max-w-md text-lg leading-relaxed">{item.background || item.description}</p></section>{item.contributors?.length ? <section><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Contributors</p><p className="mt-4 font-mono text-sm uppercase leading-relaxed">{item.contributors.join(" / ")}</p></section> : null}{item.productionCredits?.length ? <section><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Production & recording</p><ul className="mt-4 space-y-2 font-mono text-sm uppercase leading-relaxed">{item.productionCredits.map((credit) => <li key={credit}>→ {credit}</li>)}</ul></section> : null}{item.sourceUrls?.length ? <section><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Sources</p><div className="mt-4 space-y-2">{item.sourceUrls.map((source) => <a key={source} href={source} target="_blank" rel="noreferrer" className="block break-all font-mono text-xs uppercase underline underline-offset-4">{source}</a>)}</div></section> : null}</aside><div><StorySyncPlayer spotifyTrackId={item.spotifyTrackId} cards={item.storySyncCards} /></div></div></main></>;
}
