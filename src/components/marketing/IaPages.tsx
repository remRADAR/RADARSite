import Link from "next/link";
import { MediaFrame } from "@/components/MediaFrame";
import { FadeIn } from "@/components/motion/FadeIn";
import { RichEditorialBody } from "@/components/marketing/RichEditorialBody";
import type { CmsRecord } from "@/lib/content-server";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import type { Article, Artist, Event, MagazineStory, RadarProject, Release } from "@/lib/ia-content";

type Entity = (Artist | Release | Article | MagazineStory | RadarProject | Event | CmsRecord) & { slug: string };

function editorial(item: Entity) {
  return normalizeEditorialRecord(item as CmsRecord);
}

function itemPath(basePath: string, item: Entity) {
  return basePath === "/ontheradar/articles" ? articlePath(editorial(item)) : `${basePath}/${encodeURIComponent(item.slug)}`;
}

export function IaIndex({ eyebrow, title, intro, items, basePath }: { eyebrow: string; title: string; intro: string; items: Entity[]; basePath: string }) {
  return <div className="pt-14"><div className="flex flex-wrap items-end justify-between gap-8 px-4 pb-10 pt-16 md:px-8 md:pt-24"><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{eyebrow}</p><h1 className="mt-4 display max-w-[10ch] text-[clamp(3rem,11vw,11rem)] leading-[.9]">{title}<span className="text-flare">.</span></h1></div><p className="max-w-sm font-mono text-xs font-bold uppercase leading-relaxed tracking-widest text-muted-foreground">{intro}</p></div><div className="grid grid-cols-1 border-t-2 border-ink md:grid-cols-2">{items.map((item, index) => { const record = editorial(item); const metadata = record.publishedAt || record.date || "RADAR"; const taxonomy = record.sectionLabel; return <FadeIn key={item.slug} className={`border-b-2 border-ink ${index % 2 === 0 ? "md:border-r-2 md:border-ink" : ""}`}><Link href={itemPath(basePath, item)} className="group/card block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare"><MediaFrame tone={index % 3 === 0 ? "flare" : index % 3 === 1 ? "cool" : "mono"} aspect="aspect-[4/3]" label={record.title} imageUrl={record.imageUrl || record.featuredImage} reveal /><div className="border-t-2 border-ink p-5 md:p-7"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{taxonomy} / {metadata}{record.author ? ` / ${record.author}` : ""}</p><h2 className="mt-3 display max-w-[15ch] text-[clamp(1.8rem,4vw,4rem)] leading-[.94]">{record.title}</h2><p className="mt-4 max-w-xl font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{record.excerpt || "Editorial excerpt pending."}</p><span className="mt-6 inline-flex font-mono text-xs font-bold uppercase tracking-widest text-flare">Open entry →</span></div></Link></FadeIn>; })}</div></div>;
}

export function IaDetail({ item, kind, backPath }: { item: Entity; kind: "article" | "magazine" | "standard"; backPath: string }) {
  const record = editorial(item);
  const subtitle = record.excerpt || record.subtitle || record.description || record.body || "";
  const body = record.body || subtitle;
  const meta = record.publishedAt || record.date || "";
  const cinematic = kind === "magazine";
  return <article className="pt-14"><div className="grid min-h-[72svh] grid-cols-1 md:grid-cols-2"><div className="flex flex-col justify-between border-b-2 border-ink p-5 md:border-b-0 md:border-r-2 md:p-10"><Link href={backPath} className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-flare">← Back to index</Link><div><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{record.sectionLabel} / {record.editorialType || kind} / {meta}{record.author ? ` · ${record.author}` : ""}</p><h1 className="mt-5 display text-[clamp(3rem,8vw,8rem)] leading-[.86]">{record.title}<span className="text-flare">.</span></h1><p className="mt-8 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">{subtitle}</p></div></div><MediaFrame tone={cinematic ? "cool" : "flare"} aspect="aspect-auto" className="min-h-[55vh] md:min-h-0" label={record.title} imageUrl={record.imageUrl || record.featuredImage} /></div><div className={`px-5 py-16 md:px-10 md:py-24 ${cinematic ? "bg-ink text-paper" : "bg-paper"}`}><div className="mx-auto max-w-4xl"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{cinematic ? "The story" : "The update"}</p><RichEditorialBody html={record.bodyHtml} fallback={body} /><div className="mt-12 grid gap-4 border-t-2 border-current pt-6 font-mono text-xs uppercase tracking-widest md:grid-cols-3"><span>{record.sectionLabel}</span><span>{record.editorialType || "Editorial"}</span><span>{record.author || "RADAR"}</span></div></div></div></article>;
}
