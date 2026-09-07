"use client";

import Link from "next/link";
import { Magnetic } from "@/components/motion/Magnetic";
import { Logo } from "@/components/Logo";
import { RADARME_URL } from "@/lib/ia-content";

const groups = [
  { href: "/radarmusic", label: "THE RADARMusic", children: [{ href: "/radarmusic/artists", label: "Artists" }, { href: "/radarmusic/releases", label: "Releases" }] },
  { href: "/ontheradar", label: "ON THE RADAR", children: [{ href: "/ontheradar/articles", label: "Articles" }, { href: "/ontheradar/magazine", label: "Magazine" }, { href: "/ontheradar/projects", label: "Projects" }, { href: "/ontheradar/events", label: "Events" }] },
  { href: "/about", label: "ABOUT", children: [{ href: "/about/our-story", label: "Our Story" }, { href: "/about/ecosystem", label: "Ecosystem" }] },
];

export function SiteHeader() {
  return <header className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-paper"><div className="flex min-h-14 items-stretch justify-between overflow-hidden"><Logo className="shrink-0 border-r-2 border-ink px-4 md:px-6" /><nav className="hidden min-w-0 items-stretch md:flex">{groups.map((group) => <div key={group.href} className="group relative flex"><Magnetic strength={0.2} className="flex"><Link href={group.href} className="flex items-center whitespace-nowrap border-l-2 border-ink px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-flare hover:text-flare-foreground lg:px-4 lg:text-[11px]">{group.label}</Link></Magnetic><div className="invisible absolute left-0 top-full min-w-48 border-2 border-t-0 border-ink bg-paper opacity-0 transition-all group-hover:visible group-hover:opacity-100">{group.children.map((child) => <Link key={child.href} href={child.href} className="block border-b-2 border-ink px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest last:border-b-0 hover:bg-flare hover:text-flare-foreground">{child.label}</Link>)}</div></div>)}<a href={RADARME_URL} target="_blank" rel="noreferrer" className="flex shrink-0 items-center whitespace-nowrap border-l-2 border-ink bg-flare px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-flare-foreground lg:px-4 lg:text-[11px]">RADARMe ↗</a></nav><a href={RADARME_URL} target="_blank" rel="noreferrer" className="flex shrink-0 items-center whitespace-nowrap border-l-2 border-ink bg-flare px-4 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-flare-foreground md:hidden">RADARMe ↗</a></div></header>;
}
