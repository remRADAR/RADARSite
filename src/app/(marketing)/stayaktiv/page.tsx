import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "stayAKTiV",
  description: "A live events lane for music, culture, and the people moving it forward.",
  path: "/stayaktiv",
});

const event = {
  title: "LIQUID CAFÉ",
  location: "CITY PARK WUSE-ABUJA",
  date: "10TH DECEMBER",
  time: "6PM",
};

export default function StayAktivPage() {
  return (
    <>
      <ArchiveStructuredData
        name="stayAKTiV"
        description="A live events lane for music, culture, and the people moving it forward."
        path="/stayaktiv"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "stayAKTiV", path: "/stayaktiv" }]}
      />
      <main className="pt-14">
        <section className="grid min-h-[72svh] border-b-2 border-ink bg-ink text-paper md:grid-cols-[1.15fr_.85fr]">
          <div className="flex flex-col justify-between border-b-2 border-paper/30 p-5 md:border-b-0 md:border-r-2 md:p-10">
            <div className="flex items-start justify-between gap-6 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-paper/60">
              <span>(RADAR / Events)</span>
              <span>01 — 01</span>
            </div>
            <div className="max-w-4xl py-20 md:py-28">
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-flare">The city is calling</p>
              <h1 className="mt-5 display text-[clamp(4rem,13vw,12rem)] leading-[.78]">stay<span className="text-flare">AKTiV</span><span className="text-paper">.</span></h1>
              <p className="mt-8 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-wide text-paper/70 md:text-base">
                A live events lane for music, culture, and the people moving it forward.
              </p>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-paper/60">Scroll to find the next room ↓</span>
          </div>
          <div className="relative flex min-h-[28rem] items-end overflow-hidden bg-[#171717] p-5 md:min-h-0 md:p-10">
            <Image src="/events/the-last-thursdays.png" alt="The Last Thursdays event artwork" fill sizes="(min-width: 768px) 42vw, 100vw" className="object-cover opacity-60 grayscale" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" aria-hidden />
            <div className="relative z-10 w-full border-t-2 border-flare pt-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-flare">Next up</p>
              <p className="mt-4 display text-4xl leading-none md:text-6xl">Make room<br />for the night.</p>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-ink px-5 py-16 md:px-10 md:py-24" aria-labelledby="upcoming-event-heading">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-5">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">01 / Upcoming</p>
              <h2 id="upcoming-event-heading" className="mt-3 display text-[clamp(3rem,8vw,8rem)] leading-[.82]">Pull up<span className="text-flare">.</span></h2>
            </div>
            <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">One signal. One room. Everybody tuned in.</p>
          </div>
          <article className="mt-8 grid border-2 border-ink md:grid-cols-[1fr_1.3fr]">
            <div className="border-b-2 border-ink bg-flare p-6 text-flare-foreground md:border-b-0 md:border-r-2 md:p-10">
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em]">Save the date</p>
              <p className="mt-16 display text-[clamp(3rem,7vw,7rem)] leading-[.78]">{event.date}</p>
              <p className="mt-8 font-mono text-sm font-bold uppercase tracking-widest">{event.time}</p>
            </div>
            <div className="flex flex-col justify-between gap-16 p-6 md:p-10">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">Live event</p>
                <h3 className="mt-4 display text-[clamp(2.8rem,6vw,6rem)] leading-[.82]">{event.title}<span className="text-flare">.</span></h3>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-8 border-t-2 border-ink pt-5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Where</p>
                  <p className="mt-2 font-mono text-sm font-bold uppercase tracking-wide">{event.location}</p>
                </div>
                <p className="max-w-xs font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">Details and access information will follow. Stay close to the signal.</p>
              </div>
            </div>
          </article>
          <div className="mt-8 border-t-2 border-ink" aria-label="Event details">
            <details className="group border-b-2 border-ink py-5" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-mono text-xs font-bold uppercase tracking-[.16em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare [&::-webkit-details-marker]:hidden">
                <span>Event essentials</span>
                <span className="text-flare transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <div className="grid gap-6 pb-2 pt-6 font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground md:grid-cols-3">
                <p><span className="mb-2 block text-[10px] font-bold tracking-widest text-ink">When</span>{event.date} / {event.time}</p>
                <p><span className="mb-2 block text-[10px] font-bold tracking-widest text-ink">Where</span>{event.location}</p>
                <p><span className="mb-2 block text-[10px] font-bold tracking-widest text-ink">What</span>{event.title}</p>
              </div>
            </details>
            <details className="group border-b-2 border-ink py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-mono text-xs font-bold uppercase tracking-[.16em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare [&::-webkit-details-marker]:hidden">
                <span>Access &amp; updates</span>
                <span className="text-flare transition-transform group-open:rotate-45" aria-hidden="true">＋</span>
              </summary>
              <p className="max-w-2xl pb-2 pt-6 font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">Details and access information will follow. Stay close to the signal.</p>
            </details>
          </div>
        </section>

        <section className="grid border-b-2 border-ink md:grid-cols-2" aria-label="StayAKTiV principles">
          {[['01', 'Find the room', 'A moving calendar for the nights, sessions, and gatherings shaping the culture.'], ['02', 'Bring your people', 'Stay connected to the artists, brands, and communities making the next moment.']].map(([number, title, copy]) => (
            <div key={number} className="border-b-2 border-ink p-6 last:border-b-0 md:border-b-0 md:border-r-2 md:p-10 md:last:border-r-0">
              <p className="font-mono text-xs font-bold text-flare">{number}</p>
              <h2 className="mt-16 display text-4xl leading-none md:text-6xl">{title}<span className="text-flare">.</span></h2>
              <p className="mt-6 max-w-md font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{copy}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-wrap items-center justify-between gap-8 bg-flare px-5 py-12 text-flare-foreground md:px-10 md:py-16">
          <p className="display max-w-3xl text-[clamp(2.5rem,6vw,6rem)] leading-[.82]">Keep your night open<span className="text-paper">.</span></p>
          <Link href="/" className="brut-border border-flare-foreground px-5 py-4 font-mono text-xs font-bold uppercase tracking-widest transition-colors hover:bg-flare-foreground hover:text-flare">Back to RADAR ↗</Link>
        </section>
      </main>
    </>
  );
}
