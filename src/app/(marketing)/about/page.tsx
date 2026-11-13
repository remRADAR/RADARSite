import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

const principles = [
  {
    number: "01",
    title: "Artist first",
    description:
      "We start with the person, the sound, and the story—not a template. Every signal deserves room to become its own language.",
  },
  {
    number: "02",
    title: "Culture in motion",
    description:
      "RADARCharts connects releases, ideas, events, and people so the work can travel further than a single post or platform.",
  },
  {
    number: "03",
    title: "Built for the long run",
    description:
      "Visibility matters, but sustainable momentum matters more. We build the infrastructure, context, and community around the work.",
  },
];

const signals = ["Artists", "Releases", "Stories", "Projects", "Events"];

export const metadata: Metadata = buildPageMetadata({
  title: "About RADARCharts",
  description:
    "Meet the people, principles, and creative ecosystem behind RADARCharts by REM.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <article className="overflow-hidden pt-14">
      <header className="border-b-2 border-ink px-4 pb-14 pt-16 md:px-8 md:pb-20 md:pt-24">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
          (03 / About RADARCharts)
        </p>
        <div className="mt-6 grid gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-end">
          <h1 className="max-w-6xl display text-[clamp(4rem,15vw,13rem)] leading-[0.76] tracking-[-0.08em]">
            THE PEOPLE
            <br />
            <span className="text-flare">BEHIND</span>
            <br />
            THE SIGNAL.
          </h1>
          <div className="max-w-md md:justify-self-end">
            <p className="text-lg leading-relaxed md:text-xl">
              RADARCharts is an artist-first music ecosystem by REM—made to give emerging voices
              the context, visibility, and support to move.
            </p>
            <p className="mt-6 font-mono text-[11px] font-bold uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">
              Discover <span aria-hidden="true">/</span> amplify <span aria-hidden="true">/</span>{" "}
              connect <span aria-hidden="true">/</span> sustain
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="about-thesis" className="grid border-b-2 border-ink lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-b-2 border-ink p-6 md:p-10 lg:border-b-0 lg:border-r-2">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (01 / Why we exist)
          </p>
          <p className="mt-16 display text-[clamp(2.2rem,5vw,5rem)] leading-[0.86] tracking-[-0.05em]">
            A SIGNAL IS ONLY AS STRONG AS THE COMMUNITY AROUND IT.
          </p>
        </div>
        <div className="p-6 md:p-10">
          <h2 id="about-thesis" className="sr-only">
            Why RADARCharts exists
          </h2>
          <p className="max-w-3xl text-xl leading-relaxed md:text-3xl md:leading-snug">
            Great music is never just a file. It is a relationship between an artist, a place, a
            point of view, and the people who recognize something in it. RADARCharts creates the
            space for those relationships to be seen and sustained.
          </p>
          <p className="mt-10 max-w-2xl border-t border-ink/40 pt-5 text-base leading-relaxed text-muted-foreground md:text-lg">
            From discovery and editorial storytelling to releases, projects, and live experiences,
            we are building a connected map for the culture moving through Africa and beyond.
          </p>
        </div>
      </section>

      <section aria-labelledby="principles" className="px-4 py-16 md:px-8 md:py-24">
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (02 / Our principles)
          </p>
          <div>
            <h2 id="principles" className="max-w-4xl display text-[clamp(3rem,8vw,7rem)] leading-[0.8] tracking-[-0.06em]">
              MAKE ROOM
              <br />
              FOR THE <span className="text-flare">REAL.</span>
            </h2>
            <div className="mt-12 grid border-t-2 border-ink sm:grid-cols-3">
              {principles.map((principle) => (
                <article
                  key={principle.number}
                  className="border-b-2 border-ink py-6 pr-5 sm:border-r-2 sm:py-7 sm:pl-5 sm:first:pl-0 sm:last:border-r-0"
                >
                  <p className="font-mono text-[11px] font-bold tracking-widest text-flare">
                    {principle.number} <span aria-hidden="true">/</span> RADAR
                  </p>
                  <h3 className="mt-14 display text-3xl leading-[0.9] tracking-[-0.04em]">
                    {principle.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="signals" className="border-y-2 border-ink bg-secondary px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (03 / The ecosystem)
          </p>
          <div>
            <h2 id="signals" className="display text-[clamp(3rem,8vw,7rem)] leading-[0.82] tracking-[-0.06em]">
              ONE SIGNAL.
              <br />
              <span className="text-flare">MANY PATHS.</span>
            </h2>
            <div className="mt-10 grid border-t border-ink/40 sm:grid-cols-5">
              {signals.map((signal, index) => (
                <div key={signal} className="border-b border-ink/40 py-5 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
                  <span className="font-mono text-[11px] font-bold text-muted-foreground">
                    0{index + 1}
                  </span>
                  <p className="mt-8 display text-2xl leading-none">{signal}</p>
                </div>
              ))}
            </div>
            <Link
              href="/about/ecosystem"
              className="mt-10 inline-flex bg-flare px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground transition-transform hover:-translate-y-1"
            >
              Explore the ecosystem <span aria-hidden="true" className="ml-3">↗</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid border-b-2 border-ink md:grid-cols-2">
        <Link href="/remradar" className="group border-b-2 border-ink p-6 transition-colors hover:bg-flare md:border-b-0 md:border-r-2 md:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-ink">
            (04 / The origin)
          </p>
          <h2 className="mt-20 display text-[clamp(2.4rem,7vw,6rem)] leading-[0.82] tracking-[-0.06em]">
            THE REM
            <br />
            <span className="text-flare group-hover:text-ink">ORIGIN.</span>
          </h2>
          <p className="mt-8 max-w-sm text-base leading-relaxed group-hover:text-ink">
            Meet the founder, the purpose, and the artist-first model behind the signal.
          </p>
        </Link>
        <Link href="/contact" className="group p-6 transition-colors hover:bg-flare md:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-ink">
            (05 / Keep moving)
          </p>
          <h2 className="mt-20 display text-[clamp(2.4rem,7vw,6rem)] leading-[0.82] tracking-[-0.06em]">
            GET ON
            <br />
            THE <span className="text-flare group-hover:text-ink">RADAR.</span>
          </h2>
          <p className="mt-8 max-w-sm text-base leading-relaxed group-hover:text-ink">
            Have a release, story, project, or collaboration to bring into the light? Start a
            conversation.
          </p>
        </Link>
      </section>
    </article>
  );
}
