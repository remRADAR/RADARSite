import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({ title: "The RADARCharts Ecosystem", description: "Explore the artists, releases, articles, projects, and events connected through RADARCharts.", path: "/about/ecosystem" });

import Link from "next/link";
// The ecosystem tiles open the real public archive routes — no invented
// destinations, no dead ends.
const tiles = [
  { label: "Artists", href: "/radarmusic/artists" },
  { label: "Releases", href: "/radarmusic/releases" },
  { label: "Articles", href: "/ontheradar/articles" },
  { label: "Projects", href: "/ontheradar/projects" },
  { label: "Events", href: "/ontheradar/events" },
];
export default function EcosystemPage() { return <article className="px-4 pb-24 pt-20 md:px-8 md:pt-28"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(About / Ecosystem)</p><h1 className="mt-5 max-w-6xl display text-[clamp(3rem,10vw,10rem)] leading-[.84]">One signal.<br /><span className="text-flare">Many paths.</span></h1><div className="mt-16 grid gap-0 border-t-2 border-ink md:grid-cols-5">{tiles.map((tile, i) => <Link key={tile.label} href={tile.href} className="group border-b-2 border-ink p-5 transition-colors hover:bg-flare md:border-r-2"><span className="font-mono text-xs font-bold">0{i + 1}</span><h2 className="mt-12 display text-3xl">{tile.label}<span className="text-flare group-hover:text-ink">.</span></h2></Link>)}</div><Link href="https://radarme.app" target="_blank" rel="noreferrer" className="mt-12 inline-flex bg-flare px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground">Connect through RADARMe ↗</Link></article>; }
