"use client";

import { useState } from "react";
import { CatalogueCounters } from "@/components/legends/zumzy-brown/CatalogueCounters";
import {
  zumzyExternalLinks,
  zumzyPlatforms,
  zumzyReleases,
  zumzyStats,
  type ZumzyRelease,
  type ZumzyReleaseCategory,
} from "@/data/zumzy-brown";

const FILTERS: Array<{ key: ZumzyReleaseCategory | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "single", label: "Singles" },
  { key: "ep", label: "EPs" },
  { key: "compilation", label: "Compilations" },
  { key: "tribute", label: "Tributes & collaborations" },
  { key: "appearance", label: "Guest appearances" },
];

const CATEGORY_LABEL: Record<ZumzyReleaseCategory, string> = {
  single: "Single",
  ep: "EP",
  compilation: "Compilation",
  tribute: "Tribute / collaboration",
  appearance: "Guest appearance",
};

function ReleaseCard({ release }: { release: ZumzyRelease }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className="brut-border group flex flex-col bg-paper"
      aria-labelledby={"release-" + release.id + "-title"}
    >
      {/* Artwork surface. TODO(artwork): authorised artwork is not in the
       * repository — a designed tonal field stands in until cleared. */}
      <div className="relative aspect-square overflow-hidden bg-[linear-gradient(150deg,#050505_0%,#1c1c19_55%,#2a2a26_100%)]">
        {release.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- authorised remote artwork is rendered directly.
          <img src={release.artworkUrl} alt={release.title + " artwork"} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <div className="dot-grid absolute inset-0 opacity-20" aria-hidden />
            <div className="grain-overlay absolute inset-0 opacity-10" aria-hidden />
            <span className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <span className="display line-clamp-3 text-[clamp(1rem,2.2vw,1.6rem)] text-paper/85">{release.title}</span>
            </span>
          </>
        )}
        <span className="absolute bottom-2 left-2 bg-paper px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink">
          {release.type}
        </span>
        {release.posthumous && (
          <span className="absolute bottom-2 right-2 border border-paper/70 bg-ink px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-paper">
            Posthumous
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 id={"release-" + release.id + "-title"} className="text-lg font-black leading-tight text-ink">
          {release.title}
        </h3>
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {release.year} &middot; {CATEGORY_LABEL[release.category]} &middot;{" "}
          {release.trackCount} {release.trackCount === 1 ? "track" : "tracks"}
        </p>
        {release.note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{release.note}</p>}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={"release-" + release.id + "-details"}
          className="mt-4 self-start border border-ink px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flare"
        >
          {open ? "Close details" : "Details & listening"}
        </button>

        <div
          id={"release-" + release.id + "-details"}
          hidden={!open}
          className="mt-4 border-t-2 border-ink/10 pt-4"
        >
          {release.tracks?.length ? (
            <>
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60">Tracklist</p>
              <ol className="mt-2 space-y-1 text-sm leading-snug text-ink/85">
                {release.tracks.map((track, index) => (
                  <li key={release.id + "-" + index} className="flex gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                    {track}
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {release.credits?.length ? (
            <p className="mt-3 text-xs text-muted-foreground">Credits: {release.credits.join("; ")}.</p>
          ) : null}

          <p className="mt-4 font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60">Listen officially</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {release.deezerUrl && (
              <li>
                <a href={release.deezerUrl} target="_blank" rel="noopener noreferrer" className="inline-block border border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-ink hover:text-paper">
                  Deezer
                </a>
              </li>
            )}
            {release.spotifySearchUrl && (
              <li>
                <a href={release.spotifySearchUrl} target="_blank" rel="noopener noreferrer" className="inline-block border border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-ink hover:text-paper">
                  Spotify <span aria-hidden>&middot;</span> search
                </a>
              </li>
            )}
            {release.appleMusicUrl && (
              <li>
                <a href={release.appleMusicUrl} target="_blank" rel="noopener noreferrer" className="inline-block border border-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink hover:bg-ink hover:text-paper">
                  Apple Music
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </article>
  );
}

/** Click-to-load Spotify artist embed — never loaded with the hero, never autoplayed. */
function SpotifyEmbed() {
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="brut-shadow w-full border-2 border-ink bg-paper px-6 py-5 text-left font-mono text-[11px] font-bold uppercase tracking-widest text-ink transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-flare"
      >
        Load Spotify player &mdash; Zumzy Brown on Spotify
        <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal opacity-70">
          Opens Spotify&rsquo;s official embed. Nothing plays until you press play there.
        </span>
      </button>
    );
  }
  return (
    <iframe
      title="Zumzy Brown on Spotify (official embed)"
      src={zumzyExternalLinks.spotifyArtistEmbed}
      width="100%"
      height="352"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="block border-2 border-ink bg-paper"
    />
  );
}

/**
 * FRAME 02 — THE SOUND. Catalogue statistics, the verified discography
 * explorer, and the year timeline.
 */
export function SoundFrame() {
  const [filter, setFilter] = useState<ZumzyReleaseCategory | "all">("all");
  const visible = zumzyReleases.filter((release) => filter === "all" || release.category === filter);
  const years = [...new Set(zumzyReleases.map((release) => release.year))].sort();

  return (
    <section id="frame-sound" aria-labelledby="sound-heading" className="bg-paper px-5 py-20 sm:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Frame 02</p>
          <h2 id="sound-heading" className="display mt-3 text-[clamp(2.6rem,8vw,6.5rem)] text-ink">
            The Sound<span className="punctuation-lock">.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Counts below are based on release listings, with compilation tracks deduplicated.
            Artist-profile links do not confirm that every release is available on every service;
            release-specific links are shown where verified.
          </p>
        </header>

        <div className="mt-12">
          <CatalogueCounters stats={zumzyStats} />
        </div>

        <div className="mt-12">
          <SpotifyEmbed />
        </div>

        {/* Discography filters */}
        <div className="mt-14">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">Discography</h3>
          <div role="group" aria-label="Filter releases by category" className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((entry) => {
              const isActive = filter === entry.key;
              return (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setFilter(entry.key)}
                  className={
                    isActive
                      ? "border-2 border-ink bg-ink px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-paper focus-visible:outline-2 focus-visible:outline-flare"
                      : "border-2 border-ink/25 bg-transparent px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-flare"
                  }
                >
                  {entry.label}
                </button>
              );
            })}
          </div>

          <ul aria-live="polite" className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((release) => (
              <li key={release.id}>
                <ReleaseCard release={release} />
              </li>
            ))}
          </ul>
          {visible.length === 0 && (
            <p className="mt-8 border-2 border-ink p-5 font-mono text-xs uppercase tracking-widest text-ink">
              No releases in this category.
            </p>
          )}
        </div>

        {/* Year timeline — vertical, readable on small screens. */}
        <div className="mt-16">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">Releases by year</h3>
          <ol className="mt-6 space-y-6 border-l-2 border-ink/20 pl-5">
            {years.map((year) => {
              const inYear = zumzyReleases.filter((release) => release.year === year);
              return (
                <li key={year} className="relative">
                  <span aria-hidden className="absolute -left-[27px] top-1.5 block h-2.5 w-2.5 bg-ink" />
                  <p className="display text-2xl text-ink">{year}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {inYear.map((release) => (
                      <li key={release.id} className="border border-ink/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-ink/80">
                        {release.title}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Official platforms */}
        <div className="mt-16">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">Artist profiles</h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Profile links are checked artist pages. Availability varies by release and service.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {zumzyPlatforms.map((platform) => (
              <li key={platform.name}>
                <a
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brut-shadow inline-block border-2 border-ink bg-paper px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-flare"
                >
                  {platform.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
