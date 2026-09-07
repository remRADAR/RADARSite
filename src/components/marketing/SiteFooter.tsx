"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FaLinkedinIn } from "react-icons/fa6";
import { SiFacebook, SiInstagram, SiThreads, SiTiktok, SiX, SiYoutube } from "react-icons/si";
import { Marquee } from "@/components/motion/Marquee";
import { RADARME_URL } from "@/lib/ia-content";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";

const NAV = [{ href: "/radarmusic", label: "THE RADARMusic" }, { href: "/ontheradar", label: "ON THE RADAR" }, { href: "/about", label: "ABOUT" }, { href: "/privacy", label: "PRIVACY" }, { href: "/terms", label: "TERMS" }, { href: RADARME_URL, label: "RADARMe ↗" }];
const SOCIALS = [
  { href: "https://www.instagram.com/remradar/", label: "Instagram", Icon: SiInstagram },
  { href: "https://x.com/RADARCharts", label: "X", Icon: SiX },
  { href: "https://www.facebook.com/radarcharts/", label: "Facebook", Icon: SiFacebook },
  { href: "https://www.threads.com/@remradar", label: "Threads", Icon: SiThreads },
  { href: "https://www.linkedin.com/company/radarcharts/", label: "LinkedIn", Icon: FaLinkedinIn },
  { href: "https://www.youtube.com/@remradar", label: "YouTube", Icon: SiYoutube },
  { href: "https://www.tiktok.com/@radarcharts", label: "TikTok", Icon: SiTiktok },
];

export function SiteFooter() {
  const snapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(snapshot);
  const socialLinks = overrides.socialLinks.filter((link) => link.enabled);
  const socialIcons = new Map(SOCIALS.map((social) => [social.label, social.Icon]));
  const nav = NAV.map((item) => item.label === "RADARMe ↗" ? { ...item, href: overrides.radarMeUrl || RADARME_URL } : item);
  return <footer className="on-dark bg-ink text-paper"><div className="overflow-hidden border-b-2 border-paper py-6"><Marquee durationSeconds={24}><span className="mx-8 display text-[clamp(2.5rem,7vw,6rem)] leading-none">remRADAR</span><span className="mx-8 display text-[clamp(2.5rem,7vw,6rem)] leading-none text-flare">✳</span></Marquee></div><div className="grid grid-cols-1 md:grid-cols-3"><div className="border-b-2 border-paper p-6 md:border-b-0 md:border-r-2 md:p-8"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">(Index)</p><nav className="mt-4 flex flex-col gap-2">{nav.map((n) => n.href.startsWith("http") ? <a key={n.label} href={n.href} target="_blank" rel="noreferrer" className="w-fit font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:text-flare">{n.label}</a> : <Link key={n.label} href={n.href} className="w-fit font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:text-flare">{n.label}</Link>)}</nav></div><div className="border-b-2 border-paper p-6 md:border-b-0 md:border-r-2 md:p-8"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">(Social)</p><div className="mt-4 flex flex-wrap gap-3">{socialLinks.map(({ href, label }) => { const Icon = socialIcons.get(label); return Icon ? <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Follow remRADAR on ${label}`} title={label} className="brut-border border-paper inline-flex h-11 w-11 items-center justify-center text-paper transition-colors hover:bg-flare hover:text-flare-foreground"><Icon aria-hidden size={19} /></a> : null; })}</div></div><div className="p-6 md:p-8"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">(remRADAR)</p><p className="mt-4 font-mono text-sm uppercase leading-relaxed tracking-wide">A music ecosystem for artists, releases, stories, projects, and the people moving culture forward.</p></div></div><div className="flex items-center justify-between border-t-2 border-paper px-6 py-4 md:px-8"><p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">© REM 2026</p><p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">All rights reserved</p></div></footer>;
}
