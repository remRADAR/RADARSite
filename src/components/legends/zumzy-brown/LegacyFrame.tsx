"use client";

import { useEffect, useState } from "react";
import { ShareActions } from "@/components/marketing/ShareActions";
import {
  zumzyArchive,
  zumzyIdentity,
  zumzyMilestones,
  zumzyPlatforms,
  zumzyTributes,
} from "@/data/zumzy-brown";

const KIND_LABEL = { life: "Life", music: "Music", legacy: "Legacy" } as const;

/** Expandable archive viewer with keyboard + touch support for approved media. */
function ArchiveGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex]);

  if (zumzyArchive.length === 0) {
    return (
      <div className="brut-border bg-paper p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">Archive pending approval</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Photographs and video of Zumzy Brown will appear here once the family and Royal Empire
          Management approve the assets. Nothing is published before clearance — the archive is a
          documented extension point, not an empty promise.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {zumzyArchive.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={"Open " + item.kind + ": " + item.caption}
              className="brut-border group block w-full bg-paper text-left focus-visible:outline-2 focus-visible:outline-flare"
            >
              {item.url && item.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element -- approved archive media rendered directly.
                <img src={item.url} alt={item.caption} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="aspect-[4/5] w-full bg-[linear-gradient(150deg,#0e0e0c_0%,#1c1c19_100%)]" aria-hidden />
              )}
              <span className="block p-3 text-xs leading-snug text-ink">{item.caption}</span>
            </button>
          </li>
        ))}
      </ul>
      {openIndex !== null && zumzyArchive[openIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zumzyArchive[openIndex].caption}
          onClick={() => setOpenIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-5"
        >
          <figure className="max-h-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {zumzyArchive[openIndex].kind === "photo" && zumzyArchive[openIndex].url ? (
              // eslint-disable-next-line @next/next/no-img-element -- lightbox for approved media.
              <img src={zumzyArchive[openIndex].url} alt={zumzyArchive[openIndex].caption} className="brut-border max-h-[75svh] w-auto max-w-full object-contain" />
            ) : null}
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-paper">
              <span className="text-sm">{zumzyArchive[openIndex].caption}</span>
              <button type="button" onClick={() => setOpenIndex(null)} className="border border-paper px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest">
                Close
              </button>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

/**
 * FRAME 03 — THE LEGACY. Verified milestones, the approved media archive,
 * published tributes, and the closing remembrance.
 */
export function LegacyFrame() {
  return (
    <section id="frame-legacy" aria-labelledby="legacy-heading" className="on-dark bg-ink px-5 py-20 text-paper sm:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-paper/60">Frame 03</p>
          <h2 id="legacy-heading" className="display mt-3 text-[clamp(2.6rem,8vw,6.5rem)]">
            The Legacy<span className="punctuation-lock">.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/75">
            A chronology of documented facts — his life, his music, and what REM and his family
            have carried forward. Editorial words are kept separate from record.
          </p>
        </header>

        {/* Milestone timeline */}
        <div className="mt-14">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">Life, music &amp; legacy</h3>
          <ol className="mt-6 space-y-8 border-l-2 border-paper/20 pl-5">
            {zumzyMilestones.map((milestone) => (
              <li key={milestone.year + "-" + milestone.title} className="relative">
                <span aria-hidden className="absolute -left-[27px] top-1.5 block h-2.5 w-2.5 bg-paper" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-paper/60">
                  {milestone.year} &middot; {KIND_LABEL[milestone.kind]}
                </p>
                <h4 className="mt-1 text-xl font-black leading-tight">{milestone.title}</h4>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-paper/75">{milestone.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Archive */}
        <div className="mt-16">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">The archive</h3>
          <div className="mt-6">
            <ArchiveGrid />
          </div>
        </div>

        {/* Tributes — published, attributed material only. */}
        <div className="mt-16">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">Tributes</h3>
          <ul className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {zumzyTributes.map((tribute) => (
              <li key={tribute.quote} className="brut-border bg-[#0d0d0b] p-6">
                <blockquote className="text-base font-semibold leading-relaxed">
                  &ldquo;{tribute.quote}&rdquo;
                </blockquote>
                <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-widest text-paper/70">{tribute.author}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-paper/55">
                  <a href={tribute.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-paper">
                    {tribute.source}
                  </a>
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-paper/50">
            Published tribute material only. A moderated tribute submission flow is a documented
            extension point; no form is shown until moderation and storage exist.
          </p>
        </div>

        {/* Identity record — documented facts and name variations. */}
        <div className="mt-16 border-t-2 border-paper/15 pt-8">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]">Identity record</h3>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/75">
            {zumzyIdentity.name}, born {zumzyIdentity.bornLabel}, died {zumzyIdentity.diedLabel} —
            legal name {zumzyIdentity.legalName}. Public sources also carry the spelling
            {zumzyIdentity.nameVariations.map((variation) => " “" + variation.value + "” (" + variation.source + ")").join(", ")}.
            These variations are documented for review, not silently resolved.
          </p>
        </div>

        {/* Closing remembrance */}
        <div className="mt-16 border-t-2 border-paper/15 pt-10">
          <p className="display max-w-4xl text-[clamp(1.6rem,4.5vw,3.2rem)]">
            Zumzy Brown lived 23 years and left a catalogue that still plays.
            A life. A sound. A legacy.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {zumzyPlatforms.map((platform) => (
              <li key={platform.name}>
                <a href={platform.url} target="_blank" rel="noopener noreferrer" className="inline-block border border-paper/60 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-paper/85 hover:border-paper hover:text-paper focus-visible:outline-2 focus-visible:outline-flare">
                  {platform.name}
                </a>
              </li>
            ))}
          </ul>
          <ShareActions
            url="https://radarcharts.net/legends/zumzy-brown"
            title="LEGEND FOREVER — Zumzy Brown, by RADARCharts by REM"
          />
        </div>
      </div>
    </section>
  );
}
