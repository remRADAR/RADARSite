"use client";

import { FadeIn } from "@/components/motion/FadeIn";
import { homepageContent } from "@/lib/radar-content";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";
import { useSyncExternalStore } from "react";
import Link from "next/link";

export function PillarsSection() {
  const overrides = parseSiteOverrides(useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot));
  const pillars = overrides.ecosystemNav.filter((item) => item.visible).sort((a, b) => a.order - b.order).map((item, index) => ({ number: String(index + 1).padStart(2, "0"), label: item.label, description: homepageContent.pillars.find((pillar) => pillar.label.toLowerCase() === item.label.toLowerCase())?.description || item.slug, href: item.slug }));
  return (
    <section className="bg-paper">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 px-4 py-8 md:grid-cols-[8rem_minmax(0,1fr)_28rem] md:gap-8 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest md:col-span-2">(02) AKT!V</p>
        <p className="font-mono text-right text-xs font-bold uppercase tracking-widest text-muted-foreground md:text-left">ECOSYSTEM</p>
      </div>
      <div className="brut-border-t">
        {(pillars.length ? pillars : homepageContent.pillars.map((pillar) => ({ ...pillar, href: pillar.label === "ARTICLES" ? "/ontheradar/articles" : pillar.label === "MUSIC" ? "/radarmusic" : pillar.label === "MAGAZINE" ? "/ontheradar/magazine" : "/ontheradar/projects" }))).map((pillar) => (
          <FadeIn key={pillar.number}>
            <Link href={pillar.href} onPointerDown={() => { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8); }} className="group brut-border-b relative block overflow-hidden transition-transform duration-150 active:scale-[0.995] active:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-flare">
              <div className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-flare transition-transform duration-500 ease-[var(--ease-slam)] group-hover:scale-x-100" />
              <div className="relative grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_minmax(7rem,40%)] items-center gap-x-3 px-4 py-6 md:grid-cols-[8rem_minmax(0,1fr)_28rem] md:gap-8 md:px-8 md:py-10">
                <span className="whitespace-nowrap font-mono text-[clamp(.55rem,1.8vw,.875rem)] font-bold">{pillar.number}</span>
                <h3 className={`display min-w-0 whitespace-nowrap !text-[clamp(1.45rem,7vw,6rem)] ![overflow-wrap:normal] ![word-break:keep-all] leading-none ${pillar.label.toLowerCase().includes("motherland") ? "text-[#31d158]" : ""}`}>{pillar.label}</h3>
                <p className={`min-w-0 text-right font-mono text-[clamp(.6rem,1.5vw,.875rem)] uppercase leading-tight tracking-[.02em] text-muted-foreground group-hover:text-ink md:whitespace-nowrap md:leading-none ${pillar.label.toLowerCase().includes("motherland") ? "text-[#31d158] group-hover:text-[#31d158]" : ""}`}>{pillar.description}</p>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
