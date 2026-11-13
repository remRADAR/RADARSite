import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo";

const lanes = [
  ["01", "Artists", "The people and voices moving the signal forward."],
  ["02", "Releases", "The records, projects, and moments worth following."],
  ["03", "Articles", "Stories, interviews, and context around the work."],
  ["04", "Projects", "Creative builds that turn an idea into a visible world."],
  ["05", "Events", "The rooms where artists, fans, and culture meet."],
] as const;

export const metadata: Metadata = buildPageMetadata({
  title: "The RADARCharts Ecosystem",
  description: "The artists, releases, stories, projects, and events connected through RADARCharts.",
  path: "/about/ecosystem",
});

export default function EcosystemPage() {
  return (
    <article className="min-h-screen px-4 pb-24 pt-28 md:px-8">
      <div className="flex items-center justify-between border-b-2 border-ink pb-4 font-mono text-xs font-bold uppercase tracking-[0.16em]">
        <span>(03 / The ecosystem)</span>
        <Link href="/about" className="text-flare hover:text-ink">Back to About ↗</Link>
      </div>
      <header className="py-12 md:py-20">
        <h1 className="max-w-6xl display text-[clamp(4rem,15vw,13rem)] leading-[0.76] tracking-[-0.08em]">
          ONE SIGNAL.
          <br />
          <span className="text-flare">MANY PATHS.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          RADARCharts by REM is a connected music ecosystem. Choose a lane and follow the work.
        </p>
      </header>
      <section className="border-y-2 border-ink" aria-label="RADARCharts ecosystem lanes">
        {lanes.map(([number, label, description]) => (
          <div key={number} className="grid gap-4 border-b-2 border-ink p-5 last:border-b-0 md:grid-cols-[0.12fr_0.32fr_0.56fr] md:items-center md:p-7">
            <span className="font-mono text-xs font-bold text-flare">{number}</span>
            <h2 className="display text-4xl leading-none tracking-[-0.05em] md:text-6xl">{label}</h2>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground md:justify-self-end md:text-lg">{description}</p>
          </div>
        ))}
      </section>
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs font-bold uppercase tracking-[0.14em]">
        <Link href="/radarmusic" className="hover:text-flare">RADARMusic ↗</Link>
        <Link href="/ontheradar" className="hover:text-flare">On The RADAR ↗</Link>
        <Link href="https://radarme.app" target="_blank" rel="noreferrer" className="hover:text-flare">RADARMe ↗</Link>
      </div>
    </article>
  );
}
