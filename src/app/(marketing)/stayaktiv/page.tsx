import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "stayAKTiV",
  description: "A live events lane for music, culture, and the people moving it forward.",
  path: "/stayaktiv",
});

const featuredEvent = {
  title: "LIQUID CAFÉ",
  location: "CITY PARK WUSE-ABUJA",
  date: "10TH DECEMBER",
  time: "6PM",
};

const principles = [
  ["01", "Find the room", "A moving calendar for the nights, sessions, and gatherings shaping the culture."],
  ["02", "Bring your people", "Stay connected to the artists, brands, and communities making the next moment."],
  ["03", "Keep the signal", "The details change. The invitation stays open: show up, tune in, stay active."],
] as const;

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
        <section className="border-b-2 border-ink bg-ink text-paper" aria-labelledby="stayaktiv-title">
          <div className="flex items-center justify-between border-b border-paper/30 px-4 py-4 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-paper/60 md:px-8">
            <span>(01 / stayAKTiV)</span>
            <span>Live events / Abuja</span>
          </div>

          <div className="grid md:grid-cols-[1.08fr_.92fr]">
            <div className="flex min-h-[70svh] flex-col justify-between border-b border-paper/30 p-5 md:border-b-0 md:border-r md:p-10">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-flare">The city is calling</p>
                <h1 id="stayaktiv-title" className="mt-6 max-w-5xl display text-[clamp(4.5rem,13vw,12rem)] leading-[.76]">
                  stay<span className="text-flare">AKTiV</span><span className="text-paper">.</span>
                </h1>
                <p className="mt-10 max-w-lg font-mono text-sm uppercase leading-relaxed tracking-wide text-paper/70 md:text-base">
                  A live events lane for music, culture, and the people moving it forward.
                </p>
              </div>

              <div className="mt-20 flex items-end justify-between gap-6 border-t border-paper/30 pt-5 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-paper/60">
                <span>Find the next room</span>
                <span aria-hidden>↓</span>
              </div>
            </div>

            <div className="relative min-h-[30rem] overflow-hidden md:min-h-0">
              <Image
                src="/events/the-last-thursdays.png"
                alt="Event artwork for The Last Thursdays"
                fill
                sizes="(min-width: 768px) 46vw, 100vw"
                className="object-cover opacity-70 grayscale transition-transform duration-700 hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" aria-hidden />
              <div className="absolute inset-x-5 bottom-5 border-t-2 border-flare pt-4 md:inset-x-10 md:bottom-10">
                <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-flare">Next on the RADAR</p>
                <p className="mt-4 max-w-sm display text-[clamp(2.5rem,5vw,5rem)] leading-[.82]">Make room for the night.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-ink px-4 py-16 md:px-8 md:py-24" aria-labelledby="featured-event-title">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink pb-5">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">02 / The next room</p>
              <h2 id="featured-event-title" className="mt-3 display text-[clamp(3.5rem,9vw,9rem)] leading-[.78]">
                Pull up<span className="text-flare">.</span>
              </h2>
            </div>
            <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
              One signal. One room. Everybody tuned in.
            </p>
          </div>

          <article className="mt-8 grid border-2 border-ink md:grid-cols-[.72fr_1.28fr]">
            <div className="flex min-h-[20rem] flex-col justify-between border-b-2 border-ink bg-flare p-5 text-flare-foreground md:border-b-0 md:border-r-2 md:p-8">
              <div className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase tracking-[.16em]">
                <span>Save the date</span>
                <span>01</span>
              </div>
              <div>
                <p className="display text-[clamp(3.4rem,7vw,7rem)] leading-[.76]">{featuredEvent.date}</p>
                <p className="mt-7 font-mono text-sm font-bold uppercase tracking-widest">{featuredEvent.time}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-14 p-5 md:p-8">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">Live event / Abuja</p>
                <h3 className="mt-5 display text-[clamp(3rem,7vw,7rem)] leading-[.78]">
                  {featuredEvent.title}<span className="text-flare">.</span>
                </h3>
              </div>

              <dl className="grid border-t-2 border-ink pt-5 sm:grid-cols-2">
                <div className="border-b-2 border-ink pb-5 sm:border-b-0 sm:border-r-2 sm:pr-6">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Where</dt>
                  <dd className="mt-2 font-mono text-sm font-bold uppercase leading-relaxed tracking-wide">{featuredEvent.location}</dd>
                </div>
                <div className="pt-5 sm:pl-6 sm:pt-0">
                  <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</dt>
                  <dd className="mt-2 font-mono text-sm font-bold uppercase leading-relaxed tracking-wide">Details to follow</dd>
                </div>
              </dl>
            </div>
          </article>
        </section>

        <section className="border-b-2 border-ink" aria-labelledby="stayaktiv-principles-title">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink px-4 py-8 md:px-8">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-muted-foreground">03 / The format</p>
              <h2 id="stayaktiv-principles-title" className="mt-3 display text-[clamp(2.8rem,7vw,7rem)] leading-[.8]">Keep it moving<span className="text-flare">.</span></h2>
            </div>
            <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">A living lane for the people, places, and nights that keep culture in motion.</p>
          </div>
          <div className="grid md:grid-cols-3">
            {principles.map(([number, title, copy], index) => (
              <div key={number} className={`group min-h-[19rem] border-b-2 border-ink p-5 transition-colors hover:bg-flare hover:text-flare-foreground md:min-h-[24rem] md:border-b-0 md:p-8 ${index < principles.length - 1 ? "md:border-r-2" : ""}`}>
                <p className="font-mono text-xs font-bold text-flare group-hover:text-flare-foreground">{number}</p>
                <h3 className="mt-20 max-w-xs display text-[clamp(2.2rem,4vw,4rem)] leading-[.85]">{title}<span className="text-flare group-hover:text-flare-foreground">.</span></h3>
                <p className="mt-6 max-w-sm font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground group-hover:text-flare-foreground/75">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-wrap items-end justify-between gap-8 bg-flare px-4 py-14 text-flare-foreground md:px-8 md:py-20" aria-labelledby="stay-close-title">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[.2em]">04 / Stay close</p>
            <h2 id="stay-close-title" className="mt-5 max-w-4xl display text-[clamp(3rem,7vw,7rem)] leading-[.78]">Keep your night open<span className="text-paper">.</span></h2>
          </div>
          <Link href="/" className="brut-border border-flare-foreground px-5 py-4 font-mono text-xs font-bold uppercase tracking-widest transition-colors hover:bg-flare-foreground hover:text-flare">
            Back to RADAR ↗
          </Link>
        </section>
      </main>
    </>
  );
}
