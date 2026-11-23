"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { MediaFrame } from "@/components/MediaFrame";
import { FadeIn } from "@/components/motion/FadeIn";
import type { CmsRecord } from "@/lib/content-server";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import type { Article, MagazineStory } from "@/lib/ia-content";

type MagazineItem = (Article | MagazineStory | CmsRecord) & { slug: string };
type ArchiveTone = "flare" | "cool";

function archiveImageUrl(record: CmsRecord) {
  const explicit = typeof record.imageUrl === "string" && record.imageUrl.trim()
    ? record.imageUrl
    : typeof record.featuredImage === "string" && record.featuredImage.trim()
      ? record.featuredImage
      : "";
  const richBody = typeof record.bodyHtml === "string" && record.bodyHtml ? record.bodyHtml : typeof record.body === "string" ? record.body : "";
  const inline = richBody.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || "";
  const candidate = explicit || inline;
  if (!candidate) return undefined;
  if (candidate.startsWith("/")) return candidate;
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" && url.hostname === "radarcharts.net") url.protocol = "https:";
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function itemPath(item: MagazineItem) {
  return articlePath(normalizeEditorialRecord(item as CmsRecord));
}

function ArchiveCard({ title, count, description, tone, onClick }: { title: string; count: number; description: string; tone: ArchiveTone; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group relative min-h-[18rem] overflow-hidden border-2 border-ink bg-paper p-6 text-left shadow-[8px_8px_0_0_var(--ink)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare md:min-h-[24rem] md:p-9">
      <span className={`absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${tone === "flare" ? "bg-flare" : "bg-ink"}`} aria-hidden="true" />
      <span className="relative flex h-full flex-col justify-between">
        <span className="flex items-start justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground group-hover:text-paper">
          <span>Archive lane</span><span>{String(count).padStart(2, "0")} entries</span>
        </span>
        <span>
          <span className="block display text-[clamp(2.8rem,7vw,6.8rem)] leading-[.82] group-hover:text-paper">{title}<span className={tone === "flare" ? "text-flare group-hover:text-ink" : "text-flare"}>.</span></span>
          <span className="mt-6 block max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground group-hover:text-paper/75">{description}</span>
          <span className="mt-8 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-flare group-hover:text-paper">Browse archive <span aria-hidden="true">↗</span></span>
        </span>
      </span>
    </button>
  );
}

export function MagazineArchiveHub({ specialEpisodes, magazineEpisodes }: { specialEpisodes: MagazineItem[]; magazineEpisodes: MagazineItem[] }) {
  const [active, setActive] = useState<"special" | "magazine" | null>(null);
  const items = active === "special" ? specialEpisodes : magazineEpisodes;
  const tone: ArchiveTone = active === "special" ? "flare" : "cool";
  const title = active === "special" ? "Special Episodes" : "Magazine Episodes";
  const intro = active === "special" ? "Long-form special guest episodes from the canonical Magazine taxonomy." : "The regular Magazine Episode lane, separate from Press and Spotlight.";

  return (
    <div className="space-y-10">
      {!active ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ArchiveCard title="Special" count={specialEpisodes.length} description="Guest-led issues, extended conversations, and the special voices shaping the RADAR community." tone="flare" onClick={() => setActive("special")} />
          <ArchiveCard title="Magazine" count={magazineEpisodes.length} description="The regular issue line — artists, releases, and conversations in the canonical magazine archive." tone="cool" onClick={() => setActive("magazine")} />
        </div>
      ) : (
        <div id={active === "special" ? "special-episodes" : "magazine-episodes"} className="scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <button type="button" onClick={() => setActive(null)} className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-flare hover:underline"><ArrowLeft size={14} /> Back to archive lanes</button>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{items.length} {items.length === 1 ? "entry" : "entries"}</span>
          </div>
          <MagazineArchiveSection eyebrow={`(Magazine / ${active === "special" ? "Special Episode" : "Magazine Episode"})`} title={title} intro={intro} items={items} tone={tone} />
        </div>
      )}
    </div>
  );
}

export function MagazineArchiveSection({ eyebrow, title, intro, items, tone }: { eyebrow: string; title: string; intro: string; items: MagazineItem[]; tone: ArchiveTone }) {
  return (
    <section className="border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--ink)]">
      <header className={`border-b-2 border-ink p-6 md:p-8 ${tone === "flare" ? "bg-flare text-flare-foreground" : "bg-ink text-paper"}`}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="font-mono text-xs font-bold uppercase tracking-widest opacity-75">{eyebrow}</p><h2 className="mt-3 display text-[clamp(2.8rem,7vw,7rem)] leading-[.86]">{title}<span className={tone === "flare" ? "text-ink" : "text-flare"}>.</span></h2></div>
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest opacity-75">{intro}</p>
        </div>
      </header>
      {items.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2">{items.map((item, index) => { const record = normalizeEditorialRecord(item as CmsRecord); const imageUrl = archiveImageUrl(record); return <FadeIn key={item.slug} className={`border-b-2 border-ink ${index % 2 === 0 ? "md:border-r-2" : ""} ${index >= items.length - 2 ? "md:border-b-0" : ""}`}><Link href={itemPath(item)} className="group/card block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare"><MediaFrame tone={tone} aspect="aspect-[4/3] sm:aspect-[16/10]" className="bg-transparent" label={record.title} imageUrl={imageUrl} sizes="(min-width: 768px) 50vw, 100vw" reveal /><div className="border-t-2 border-ink p-5 md:p-7"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{record.publishedAt || record.date || "RADAR"}{record.author ? ` / ${record.author}` : ""}</p><h3 className="mt-3 display max-w-[15ch] text-[clamp(1.8rem,4vw,4rem)] leading-[.94]">{record.title}</h3><p className="mt-4 max-w-xl font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{record.excerpt || "Editorial excerpt pending."}</p><span className="mt-6 inline-flex font-mono text-xs font-bold uppercase tracking-widest text-flare">Open magazine →</span></div></Link></FadeIn>; })}</div> : <p className="p-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">No episodes have been published in this lane yet.</p>}
    </section>
  );
}

function sanitizeMagazineHtml(input: string) {
  const allowed = new Set(["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "b", "i", "blockquote", "ul", "ol", "li", "a", "figure", "figcaption", "img", "hr"]);
  return input.slice(0, 2_000_000).replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?(script|style|object|embed|form|svg|math|link|meta|noscript|iframe)[^>]*>/gi, "").replace(/<([a-z0-9-]+)([^>]*)>/gi, (_, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (!allowed.has(name)) return "";
    if (name === "br" || name === "hr") return `<${name}>`;
    const kept = attrs.replace(/\s+([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g, (_match: string, key: string, _quote: string, value: string) => {
      const lower = key.toLowerCase();
      if (lower.startsWith("on") || lower === "style" || lower === "class" || lower === "id" || lower === "srcset") return "";
      if (lower === "href" || lower === "src") { if (/^javascript:/i.test(value.trim())) return ""; if (lower === "src" && !/^https?:\/\//i.test(value.trim()) && !value.trim().startsWith("/")) return ""; return ` ${lower}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`; }
      return ` ${lower}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`;
    });
    return `<${name}${kept}>`;
  });
}

function splitIntoPages(html: string) {
  const safe = sanitizeMagazineHtml(html);
  const blocks = safe.split(/(?=<(?:h[1-6]|p|figure|blockquote|ul|ol|hr)\b)/i).map((part) => part.trim()).filter(Boolean);
  const editorialUnits: string[] = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const isQuestion = /^<p>\s*(?:[•●▪▸→-]\s*)?<strong\b/i.test(block) || /(?:^|>)\s*(?:[•●▪▸→-])\s*<strong\b/i.test(block);
    const next = blocks[index + 1];
    if (isQuestion && next && !/^<h[1-6]\b/i.test(next)) {
      editorialUnits.push(`${block}\n${next}`);
      index += 1;
    } else {
      editorialUnits.push(block);
    }
  }
  const pages: string[] = [];
  for (let index = 0; index < editorialUnits.length; index += 3) pages.push(editorialUnits.slice(index, index + 3).join("\n"));
  return pages.length ? pages : [safe];
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

function triggerPageFlipHaptic(direction: "next" | "prev") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(direction === "next" ? [7, 9, 7] : [5, 12, 5]);
}

export function MagazineFlipbook({ title, excerpt, bodyHtml, imageUrl, author, backPath }: { title: string; excerpt: string; bodyHtml?: string; imageUrl?: string; author?: string; backPath: string }) {
  const pages = useMemo(() => splitIntoPages(bodyHtml || `<p>${excerpt}</p>`), [bodyHtml, excerpt]);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(-1);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [stageWidth, setStageWidth] = useState(1);
  const pointerStart = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastPage = pages.length - 1;
  const atStart = page <= -1;
  const atEnd = page >= lastPage;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateWidth = () => setStageWidth(stage.clientWidth || 1);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const goToPage = useCallback((nextPage: number, direction: "next" | "prev") => { triggerPageFlipHaptic(direction); setFlipDirection(direction); setDragX(0); setIsDragging(false); setPage(clamp(nextPage, -1, lastPage)); }, [lastPage]);
  const openIssue = () => { setIsOpen(true); setPage(-1); };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setIsOpen(false); if (!isOpen) return; if (event.key === "ArrowRight" || event.key === "ArrowDown") goToPage(page + 1, "next"); if (event.key === "ArrowLeft" || event.key === "ArrowUp") goToPage(page - 1, "prev"); }
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, isOpen, page]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => { if (!isOpen) return; pointerStart.current = event.clientX; setIsDragging(true); event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => { if (!isDragging || pointerStart.current === null) return; setDragX(event.clientX - pointerStart.current); };
  const onPointerUp = () => { if (!isDragging || pointerStart.current === null) return; const width = stageRef.current?.clientWidth || 1; const distance = dragX; if (Math.abs(distance) > width * 0.2) goToPage(page + (distance < 0 ? 1 : -1), distance < 0 ? "next" : "prev"); else { setDragX(0); setIsDragging(false); } pointerStart.current = null; };
  const dragProgress = clamp(Math.abs(dragX) / stageWidth, 0, 1);

  const pageMarkup = (index: number) => index === -1
    ? <div className="flex h-full flex-col gap-5"><div className="flex items-start justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-ink/70"><span>RADAR / Magazine</span><span>Vol. 01</span></div>{imageUrl ? <div className="flex min-h-0 flex-1 items-center justify-center border-4 border-ink bg-black p-2"><img src={imageUrl} alt={`${title} cover`} className="max-h-[42svh] w-full object-contain" /></div> : null}<div><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{author || "RADARCharts by REM"}</p><h2 className="mt-3 display max-w-[8ch] text-[clamp(2.6rem,7vw,7rem)] leading-[.8]">{title}<span className="text-flare">.</span></h2><p className="mt-4 max-w-md font-mono text-xs uppercase leading-relaxed sm:text-sm">{excerpt}</p></div><div className="border-t-2 border-ink pt-4 font-mono text-[10px] font-bold uppercase tracking-widest">Cover / front matter</div></div>
    : <div className="editorial-body magazine-page-body" dangerouslySetInnerHTML={{ __html: pages[index] || "" }} />;

  return (
    <section className="magazine-reader relative min-h-[100svh] bg-ink px-2 py-3 text-paper sm:px-4 sm:py-6 md:px-8 md:py-8" aria-label={`${title} magazine reader`}>
      <style jsx global>{`@keyframes magazineFlipNext{0%{opacity:.7;transform:perspective(1800px) rotateY(-14deg) translateX(-2%);transform-origin:left center}55%{opacity:1;transform:perspective(1800px) rotateY(2deg) translateX(0)}100%{opacity:1;transform:perspective(1800px) rotateY(0) translateX(0)}}@keyframes magazineFlipPrev{0%{opacity:.7;transform:perspective(1800px) rotateY(14deg) translateX(2%);transform-origin:right center}55%{opacity:1;transform:perspective(1800px) rotateY(-2deg) translateX(0)}100%{opacity:1;transform:perspective(1800px) rotateY(0) translateX(0)}}@keyframes pageSheen{0%{opacity:0;transform:translateX(-120%)}35%{opacity:.35}100%{opacity:0;transform:translateX(220%)}}@keyframes pageSheenReverse{0%{opacity:0;transform:translateX(120%)}35%{opacity:.35}100%{opacity:0;transform:translateX(-220%)}}.magazine-reader{scroll-behavior:smooth}.magazine-page-body{height:100%;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}.magazine-page-body p,.magazine-page-body li{font-size:clamp(.78rem,1.25vw,1rem);line-height:1.58;overflow-wrap:anywhere}.magazine-page-body h1,.magazine-page-body h2,.magazine-page-body h3,.magazine-page-body h4{max-width:100%;overflow-wrap:anywhere;line-height:.92}.magazine-page-body figure{margin:0 0 1.25rem}.magazine-page-body img{display:block;max-height:34svh;width:100%;object-fit:contain;object-position:center;margin-inline:auto}.magazine-page-body a{color:var(--flare);text-decoration:underline;text-underline-offset:3px}@media (prefers-reduced-motion:reduce){.magazine-reader *{animation:none!important;scroll-behavior:auto!important;transition:none!important}}`}</style>
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-7xl flex-col sm:min-h-[calc(100svh-3rem)]">
        <div className="mb-2 flex items-center justify-between px-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-paper/70 sm:mb-3"><Link href={backPath} className="hover:text-flare">← Magazine</Link><span className="max-w-[45%] truncate text-center">{author || "RADARCharts"}</span>{isOpen ? <button type="button" aria-label="Close issue" onClick={() => { setIsOpen(false); setPage(-1); }} className="hover:text-flare"><X size={18} /></button> : <span aria-hidden="true" className="w-[18px]" />}</div>
        <div ref={stageRef} className={`relative mx-auto flex w-full flex-1 items-center justify-center ${isOpen ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`} onClick={() => !isOpen && openIssue()} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ touchAction: isOpen ? "pan-y" : "auto" }}>
          {!isOpen ? <div className="relative w-full max-w-[min(96vw,60rem)] overflow-hidden border-4 border-paper bg-black text-paper shadow-[10px_10px_0_0_var(--flare)]"><div className="relative flex aspect-[16/9] items-center justify-center border-b-4 border-paper bg-black p-2 sm:p-4">{imageUrl ? <img src={imageUrl} alt={`${title} cover`} className="h-full w-full object-contain" /> : <span className="font-mono text-xs uppercase tracking-widest text-paper/60">RADAR Magazine</span>}<div className="pointer-events-none absolute inset-x-4 top-4 flex justify-between font-mono text-[10px] font-bold uppercase tracking-[.18em] text-paper sm:inset-x-6 sm:top-6"><span>RADAR / Magazine</span><span>Vol. 01</span></div></div><div className="flex flex-col items-center justify-center bg-black px-5 py-6 text-center sm:px-10 sm:py-9"><p className="font-mono text-xs font-bold uppercase tracking-widest text-paper/70">{author || "RADARCharts by REM"}</p><h1 className="mt-3 max-w-[12ch] display text-[clamp(2.3rem,8vw,7rem)] leading-[.82] text-paper">{title}<span className="text-flare">.</span></h1><p className="mt-4 max-w-2xl font-mono text-[11px] uppercase leading-relaxed text-paper/70 sm:text-sm">{excerpt}</p><div className="mt-6 w-full border-t-2 border-paper pt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-paper">Tap to open issue →</div></div></div> : <div className="relative flex h-[min(82svh,60rem)] w-full max-w-7xl overflow-hidden border-2 border-paper bg-paper text-ink shadow-[10px_10px_0_0_var(--flare),0_24px_60px_rgba(0,0,0,.4)] [perspective:1800px]"> <div key={`${page}-${flipDirection}`} className={`relative z-[1] grid h-full min-w-0 flex-1 grid-cols-1 bg-paper ${page !== lastPage ? "md:grid-cols-2" : "md:grid-cols-1"} ${!isDragging ? `animate-[${flipDirection === "next" ? "magazineFlipNext" : "magazineFlipPrev"}_520ms_cubic-bezier(.22,.61,.36,1)]` : ""}`} style={isDragging ? { transform: `perspective(1800px) rotateY(${flipDirection === "next" ? -180 * dragProgress : 180 * dragProgress}deg)`, transformOrigin: flipDirection === "next" ? "left center" : "right center", transition: "none" } : undefined}>
            <div className="relative min-w-0 overflow-hidden border-b-2 border-ink p-5 sm:p-8 md:border-b-0 md:border-r-2 md:p-12 lg:p-16"><div className="mb-6 flex justify-between border-b-2 border-ink pb-3 font-mono text-[10px] font-bold uppercase tracking-widest"><span>RADAR / Magazine</span><span>{page === -1 ? "Cover" : `${page + 1} / ${pages.length + 1}`}</span></div>{pageMarkup(page)}<span className="absolute bottom-5 left-5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:left-8">{page === -1 ? "Front cover" : `Page ${page + 1}`}</span></div>
            <div className="relative hidden min-w-0 overflow-hidden p-12 lg:p-16 md:block"><div className="mb-6 flex justify-between border-b-2 border-ink pb-3 font-mono text-[10px] font-bold uppercase tracking-widest"><span>RADAR / Magazine</span><span>{page + 2 <= pages.length ? `${page + 2} / ${pages.length + 1}` : "Back cover"}</span></div>{page + 1 <= lastPage ? pageMarkup(page + 1) : <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-muted-foreground">End of issue</div>}<span className="absolute bottom-5 right-12 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{page + 1 <= lastPage ? `Page ${page + 2}` : "Back cover"}</span></div>
            <button type="button" aria-label="Previous page" onClick={(event) => { event.stopPropagation(); goToPage(page - 1, "prev"); }} disabled={atStart} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-ink bg-paper/85 p-2 shadow-[2px_3px_0_rgba(0,0,0,.18)] transition hover:bg-flare disabled:opacity-20 sm:left-4 sm:p-3"><ChevronLeft size={18} /></button><button type="button" aria-label="Next page" onClick={(event) => { event.stopPropagation(); goToPage(page + 1, "next"); }} disabled={atEnd} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-ink bg-paper/85 p-2 shadow-[2px_3px_0_rgba(0,0,0,.18)] transition hover:bg-flare disabled:opacity-20 sm:right-4 sm:p-3"><ChevronRight size={18} /></button>
          </div><div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 z-[2] w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 ${flipDirection === "next" ? "left-0 animate-[pageSheen_520ms_ease-out]" : "right-0 animate-[pageSheenReverse_520ms_ease-out]"}`} /></div>}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3 px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-paper/70 sm:mt-4">{isOpen ? <><span>{page === -1 ? "Cover" : `Page ${page + 1} / ${pages.length + 1}`}</span><span aria-hidden="true">·</span><span>Drag to hold / release to flip</span><button type="button" onClick={() => { setPage(-1); setFlipDirection("prev"); }} className="inline-flex items-center gap-1 text-flare hover:underline"><RotateCcw size={12} /> Reset</button></> : <span>Portrait reading mode</span>}</div>
      </div>
    </section>
  );
}
