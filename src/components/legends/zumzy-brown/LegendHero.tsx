"use client";

import { ResilientImage } from "@/components/ResilientImage";
import { heroPortrait, zumzyIdentity } from "@/data/zumzy-brown";

/**
 * FRAME 01 — THE LEGEND.
 * Full-viewport portrait-led opening. The portrait source is configurable in
 * the data module; until an authorised photograph is available the hero
 * renders a designed, explicitly non-photographic placeholder.
 */
export function LegendHero() {
  return (
    <section
      id="frame-legend"
      aria-labelledby="legend-heading"
      className="hero-shell bg-ink relative flex min-h-svh flex-col justify-end overflow-hidden text-paper"
    >
      {/* Portrait layer — authorised asset or designed placeholder. */}
      <div className="absolute inset-0" aria-hidden={Boolean(heroPortrait.src)}>
        {heroPortrait.src ? (
          <ResilientImage
            src={heroPortrait.src}
            alt={heroPortrait.alt}
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[50%_20%] md:object-[58%_18%]"
          />
        ) : (
          /* Placeholder field: charcoal gradient + dot grid + drifting mist.
           * TODO(portrait): replace with the authorised portrait asset. */
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#050505_0%,#0e0e0c_45%,#1c1c19_100%)]">
            <div className="dot-grid absolute inset-0 opacity-[0.16]" />
            <div className="bg-mist-cloud-1 animate-mist-slow absolute -left-[10%] top-[8%] h-[55%] w-[70%] opacity-40" />
            <div className="bg-mist-cloud-2 animate-mist-medium absolute -right-[15%] bottom-[6%] h-[60%] w-[75%] opacity-30" />
            <div className="grain-overlay absolute inset-0 opacity-[0.14]" />
          </div>
        )}
      </div>

      {/* Dark gradients that preserve the portrait and protect contrast. */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.62)_0%,rgba(5,5,5,0.18)_38%,rgba(5,5,5,0.72)_78%,rgba(5,5,5,0.94)_100%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_50%_100%,rgba(5,5,5,0.55)_0%,transparent_65%)]" aria-hidden />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-32 sm:px-8 md:pb-24">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-paper/70 sm:text-xs">
          RADARCharts by REM &middot; Legends &middot; Frame 01
        </p>
        <h1
          id="legend-heading"
          className="display hero-readable-ink mt-6 text-[clamp(3.4rem,13vw,10.5rem)] text-paper"
        >
          Legend
          <br />
          Forever<span className="punctuation-lock">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-base font-medium leading-relaxed text-paper/85 sm:text-lg">
          A life. A sound. A legacy.
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper/70 sm:text-base">
          {zumzyIdentity.name} — {zumzyIdentity.bornLabel} to {zumzyIdentity.diedLabel}.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#frame-sound"
            className="brut-shadow group inline-flex items-center gap-3 border-2 border-paper bg-paper px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink transition-transform duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare sm:text-xs"
          >
            Enter the legacy
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5">&darr;</span>
          </a>
          <a
            href="#frame-legacy"
            className="inline-flex items-center gap-2 border-b-2 border-paper/60 px-1 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-paper/85 transition-colors hover:border-paper hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare sm:text-xs"
          >
            Skip to remembrance
          </a>
        </div>
      </div>

      {/* Continuation cue — the page continues below. */}
      <a
        href="#frame-sound"
        aria-label="Continue to Frame 02, The Sound"
        className="group absolute bottom-5 left-1/2 z-10 -translate-x-1/2 pb-2 pt-6 focus-visible:outline-2 focus-visible:outline-flare"
      >
        <span className="block h-10 w-px animate-pulse bg-paper/50 transition-colors group-hover:bg-paper" aria-hidden />
        <span className="mt-2 block font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-paper/60">Continue</span>
      </a>

      {!heroPortrait.src && (
        <p className="absolute bottom-5 right-5 z-10 hidden max-w-[220px] text-right font-mono text-[9px] uppercase leading-relaxed tracking-widest text-paper/45 md:block">
          Portrait pending authorisation — placeholder shown
        </p>
      )}
      {heroPortrait.src && heroPortrait.credit && (
        <p className="absolute bottom-5 right-5 z-10 max-w-[220px] text-right font-mono text-[9px] uppercase leading-relaxed tracking-widest text-paper/70">
          {heroPortrait.credit}
        </p>
      )}
    </section>
  );
}
