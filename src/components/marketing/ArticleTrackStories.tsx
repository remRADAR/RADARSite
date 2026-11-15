import type { TrackStory } from "@/lib/track-story";
import { StorySyncPlayer } from "@/components/marketing/StorySyncPlayer";

export function ArticleTrackStories({ tracks }: { tracks: TrackStory[] }) {
  if (!tracks.length) return null;
  return (
    <section className="border-t-2 border-ink bg-ink px-5 py-14 text-paper md:px-10 md:py-20" aria-labelledby="article-trackstories-heading">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-flare">RADAR / Listening context</p>
            <h2 id="article-trackstories-heading" className="mt-3 display text-5xl leading-[.85] md:text-7xl">Read it.<br />Hear it.</h2>
          </div>
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed text-paper/60">Editorial notes that move with the track. Start playback, then follow the story at each marked moment.</p>
        </div>
        <div className="space-y-14">
          {tracks.map((track) => <article key={track.slug} className="grid gap-8 border-t border-paper/20 pt-6 lg:grid-cols-[.35fr_.65fr]"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-flare">{track.artistName}{track.releaseTitle ? ` / ${track.releaseTitle}` : ""}</p><h3 className="mt-3 display text-4xl leading-[.85] md:text-6xl">{track.title}<span className="text-flare">.</span></h3><p className="mt-5 max-w-md font-mono text-xs uppercase leading-relaxed text-paper/60">{track.description || track.background}</p></div><StorySyncPlayer spotifyTrackId={track.spotifyTrackId} cards={track.storySyncCards} /></article>)}
        </div>
      </div>
    </section>
  );
}
