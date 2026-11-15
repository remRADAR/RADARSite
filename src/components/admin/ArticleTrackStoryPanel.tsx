"use client";

import { useMemo, useState } from "react";
import type { TrackStory } from "@/lib/track-story";

type Props = {
  tracks: TrackStory[];
  selectedSlugs: string[];
  loading?: boolean;
  error?: string;
  onChange: (slugs: string[]) => void;
};

const input = "w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white";
const label = "font-mono text-[10px] uppercase tracking-[.16em] text-neutral-500";
const button = "border border-neutral-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40";

export function ArticleTrackStoryPanel({ tracks, selectedSlugs, loading = false, error = "", onChange }: Props) {
  const [query, setQuery] = useState("");
  const selected = selectedSlugs.map((slug) => tracks.find((track) => track.slug === slug)).filter((track): track is TrackStory => Boolean(track));
  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tracks.filter((track) => !selectedSlugs.includes(track.slug) && (!needle || `${track.title} ${track.artistName} ${track.releaseTitle || ""}`.toLowerCase().includes(needle)));
  }, [query, selectedSlugs, tracks]);

  const attach = (slug: string) => onChange([...selectedSlugs, slug]);
  const remove = (slug: string) => onChange(selectedSlugs.filter((item) => item !== slug));
  const move = (index: number, offset: -1 | 1) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= selectedSlugs.length) return;
    const next = [...selectedSlugs];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  return (
    <section className="border-t border-neutral-800 pt-5" aria-labelledby="article-trackstory-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={label}>Listening context</p>
          <h3 id="article-trackstory-heading" className="mt-2 text-xl font-black uppercase tracking-tight">TrackStory connections</h3>
          <p className="mt-2 max-w-2xl font-mono text-[10px] uppercase leading-relaxed text-neutral-500">Attach published or draft track stories to this article. Readers will see the listening context beneath the story.</p>
        </div>
        <a className={button} href="/admin#trackstory" target="_blank" rel="noreferrer">Open TrackStory studio ↗</a>
      </div>

      {error ? <p className="mt-4 border border-red-900 bg-red-950/30 p-3 font-mono text-[10px] uppercase text-red-300" role="alert">{error}</p> : null}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,35%)]">
        <div>
          <p className={label}>Attached to this article · {selected.length}</p>
          <div className="mt-3 space-y-2">
            {!selected.length ? <p className="border border-dashed border-neutral-800 p-5 font-mono text-[10px] uppercase leading-relaxed text-neutral-600">No TrackStories attached yet. Search the library and add one.</p> : null}
            {selected.map((track, index) => (
              <div key={track.slug} className="flex items-center gap-3 border border-neutral-800 bg-neutral-950 p-3">
                <div className="flex flex-col gap-1">
                  <button type="button" className="font-mono text-[10px] text-neutral-500 hover:text-white" aria-label={`Move ${track.title} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                  <button type="button" className="font-mono text-[10px] text-neutral-500 hover:text-white" aria-label={`Move ${track.title} down`} disabled={index === selected.length - 1} onClick={() => move(index, 1)}>↓</button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold uppercase">{track.title}</p>
                  <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-widest text-neutral-500">{track.artistName} · {track.status}</p>
                </div>
                <a className="font-mono text-[10px] uppercase underline" href={`/radarmusic/tracks/${encodeURIComponent(track.slug)}`} target="_blank" rel="noreferrer">Preview</a>
                <button type="button" className="font-mono text-[10px] uppercase text-red-300 hover:text-red-100" onClick={() => remove(track.slug)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Find a TrackStory<input className={`${input} mt-2`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, artist, release…" /></label>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {loading ? <p className="border border-dashed border-neutral-800 p-4 font-mono text-[10px] uppercase text-neutral-600">Loading TrackStory library…</p> : null}
            {!loading && !available.length ? <p className="border border-dashed border-neutral-800 p-4 font-mono text-[10px] uppercase text-neutral-600">No unattached matches.</p> : null}
            {available.map((track) => <button type="button" key={track.slug} className="block w-full border border-neutral-800 p-3 text-left transition hover:border-white" onClick={() => attach(track.slug)}><span className="block text-sm font-bold uppercase">+ {track.title}</span><span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">{track.artistName} · {track.status}</span></button>)}
          </div>
        </div>
      </div>
    </section>
  );
}
