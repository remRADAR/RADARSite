import Link from "next/link";
import { readPublishedContent } from "@/lib/content-server";
import { normalizeEditorialRecord } from "@/lib/editorial-normalization";

export const revalidate = 3600;

export default async function OnTheRadarPage() {
  const { articles, magazine, radarProjects, events } = await readPublishedContent();
  const latest = articles.map(normalizeEditorialRecord).sort((a, b) => String(b.publishedAt || b.date).localeCompare(String(a.publishedAt || a.date))).slice(0, 3);
  const rails = [
    { href: "/ontheradar/articles", label: "Articles", count: articles.length, copy: "Shorter signals, updates, announcements, and quick features." },
    { href: "/ontheradar/magazine", label: "Magazine", count: magazine.length, copy: "Long-form conversations and cultural stories." },
    { href: "/ontheradar/projects", label: "Projects", count: radarProjects.length, copy: "The creative work built across the ecosystem." },
    { href: "/ontheradar/events", label: "Events", count: events.length, copy: "Rooms, sessions, and nights to come." },
  ];
  return <div className="pt-14"><div className="px-4 pb-16 pt-20 md:px-8 md:pt-28"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(02 / On The Radar)</p><h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[.84]">Stories<br /><span className="text-flare">in motion.</span></h1><p className="mt-10 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">The RADAR editorial gateway: discover the latest signals, then move through the sections that give them context.</p></div><div className="grid border-t-2 border-ink md:grid-cols-2">{rails.map((rail, i) => <Link key={rail.href} href={rail.href} className={`group border-b-2 border-ink p-6 transition-colors hover:bg-flare md:p-10 ${i % 2 === 0 ? "md:border-r-2" : ""}`}><div className="flex justify-between font-mono text-xs font-bold uppercase tracking-widest"><span>{rail.count} entries</span><span>0{i + 1}</span></div><h2 className="mt-24 display text-5xl">{rail.label}<span className="text-flare group-hover:text-ink">.</span></h2><p className="mt-5 max-w-sm font-mono text-sm uppercase tracking-wide text-muted-foreground group-hover:text-ink">{rail.copy}</p></Link>)}</div>{latest.length > 0 && <section className="border-b-2 border-ink px-4 py-12 md:px-8 md:py-16"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Latest from the archive</p><div className="mt-8 grid gap-6 md:grid-cols-3">{latest.map((item) => <Link key={item.slug} href={`/ontheradar/articles/${encodeURIComponent(item.slug)}`} className="border-t-2 border-ink pt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-flare"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{item.sectionLabel} / {item.publishedAt || item.date || "RADAR"}</p><h2 className="mt-3 display text-3xl leading-none">{item.title}</h2><p className="mt-4 font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{item.excerpt}</p></Link>)}</div></section>}</div>;
}
