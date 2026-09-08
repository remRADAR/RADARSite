"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Magnetic } from "@/components/motion/Magnetic";
import { Logo } from "@/components/Logo";
import { RADARME_URL } from "@/lib/ia-content";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";

const groups = [
  { href: "/radarmusic", label: "THE RADARMusic", children: [{ href: "/radarmusic/artists", label: "Artists" }, { href: "/radarmusic/releases", label: "Releases" }] },
  { href: "/ontheradar", label: "ON THE RADAR", children: [{ href: "/ontheradar/articles", label: "Articles" }, { href: "/ontheradar/magazine", label: "Magazine" }, { href: "/ontheradar/projects", label: "Projects" }, { href: "/ontheradar/events", label: "Events" }] },
  { href: "/about", label: "ABOUT", children: [{ href: "/about/our-story", label: "Our Story" }, { href: "/about/ecosystem", label: "Ecosystem" }] },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const snapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const radarMeUrl = parseSiteOverrides(snapshot).radarMeUrl || RADARME_URL;

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b-2 border-ink bg-paper">
      <div className="flex min-h-14 items-stretch justify-between">
        <Logo className="min-w-0 shrink border-r-2 border-ink px-3 sm:px-4 md:px-6" />

        <nav className="hidden min-w-0 items-stretch lg:flex" aria-label="Primary navigation">
          {groups.map((group) => (
            <div key={group.href} className="group relative flex min-w-0">
              <Magnetic strength={0.2} className="flex min-w-0">
                <Link href={group.href} className="flex min-w-0 items-center whitespace-nowrap border-l-2 border-ink px-3 font-mono text-[clamp(0.625rem,0.7vw,0.75rem)] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-flare hover:text-flare-foreground xl:px-4">
                  <span className="truncate">{group.label}</span>
                  <ChevronDown aria-hidden size={12} className="ml-2 shrink-0 transition-transform group-hover:rotate-180" />
                </Link>
              </Magnetic>
              <div className={`invisible absolute top-full min-w-48 origin-top -translate-y-1 scale-y-95 border-2 border-t-0 border-ink bg-paper opacity-0 transition-[opacity,transform,visibility] duration-300 ease-[var(--ease-out)] motion-reduce:transition-none group-hover:visible group-hover:translate-y-0 group-hover:scale-y-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-y-100 group-focus-within:opacity-100 ${group === groups[groups.length - 1] ? "right-0" : "left-0"}`}>
                {group.children.map((child) => <Link key={child.href} href={child.href} className="block border-b-2 border-ink px-4 py-3 font-mono text-[clamp(0.625rem,0.7vw,0.75rem)] font-bold uppercase tracking-widest last:border-b-0 hover:bg-flare hover:text-flare-foreground">{child.label}</Link>)}
              </div>
            </div>
          ))}
          <a href={radarMeUrl} target="_blank" rel="noreferrer" className="flex shrink-0 items-center whitespace-nowrap border-l-2 border-ink bg-flare px-3 font-mono text-[clamp(0.625rem,0.7vw,0.75rem)] font-bold uppercase tracking-[0.1em] text-flare-foreground xl:px-4">RADARMe ↗</a>
        </nav>

        <div className="flex shrink-0 items-stretch lg:hidden">
          <a href={radarMeUrl} target="_blank" rel="noreferrer" className="hidden items-center whitespace-nowrap border-l-2 border-ink bg-flare px-3 font-mono text-[clamp(0.625rem,0.7vw,0.75rem)] font-bold uppercase tracking-[0.1em] text-flare-foreground sm:flex">RADARMe ↗</a>
          <button type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)} className="flex min-w-24 items-center justify-center gap-2 border-l-2 border-ink px-3 font-mono text-[clamp(0.625rem,1.8vw,0.75rem)] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-flare hover:text-flare-foreground sm:min-w-28">
            {menuOpen ? <X aria-hidden size={16} /> : <Menu aria-hidden size={16} />}
            <span>{menuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        aria-label="Expanded navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`grid border-t-2 border-ink bg-paper transition-[grid-template-rows,opacity,transform] duration-500 ease-[var(--ease-out)] motion-reduce:transition-none lg:hidden ${menuOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] -translate-y-1 opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-0 sm:grid-cols-2">
            {groups.map((group, index) => (
              <section key={group.href} className={`min-w-0 border-b-2 border-ink p-4 ${index === groups.length - 1 ? "sm:col-span-2" : ""}`}>
                <Link href={group.href} onClick={() => setMenuOpen(false)} className="flex items-center justify-between gap-3 font-mono text-[clamp(0.75rem,2.4vw,0.95rem)] font-bold uppercase tracking-[0.08em] hover:text-flare-foreground">
                  <span className="min-w-0 truncate">{group.label}</span>
                  <ChevronDown aria-hidden size={15} className="shrink-0 -rotate-90" />
                </Link>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t-2 border-ink pt-3">
                  {group.children.map((child) => <Link key={child.href} href={child.href} onClick={() => setMenuOpen(false)} className="min-w-0 border-2 border-ink px-3 py-2 font-mono text-[clamp(0.625rem,2vw,0.75rem)] font-bold uppercase tracking-widest transition-colors hover:bg-flare hover:text-flare-foreground">{child.label}</Link>)}
                </div>
              </section>
            ))}
          </div>
          <a href={radarMeUrl} target="_blank" rel="noreferrer" className="block border-b-2 border-ink bg-flare px-4 py-4 font-mono text-[clamp(0.75rem,2.4vw,0.95rem)] font-bold uppercase tracking-[0.08em] text-flare-foreground">Open RADARMe ↗</a>
        </div>
      </div>
    </header>
  );
}
