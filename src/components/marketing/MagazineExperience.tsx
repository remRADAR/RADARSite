"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { MediaFrame } from "@/components/MediaFrame";
import { FadeIn } from "@/components/motion/FadeIn";
import type { CmsRecord } from "@/lib/content-server";
import { articlePath, normalizeEditorialRecord } from "@/lib/editorial-normalization";
import type { Article, MagazineStory } from "@/lib/ia-content";

type MagazineItem = (Article | MagazineStory | CmsRecord) & { slug: string };

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
  const record = normalizeEditorialRecord(item as CmsRecord);
  return articlePath(record);
}

export function MagazineArchiveSection({ eyebrow, title, intro, items, tone }: { eyebrow: string; title: string; intro: string; items: MagazineItem[]; tone: "flare" | "cool" }) {
  return (
    <section className="border-2 border-ink bg-paper shadow-[8px_8px_0_0_var(--ink)]">
      <header className={`border-b-2 border-ink p-6 md:p-8 ${tone === "flare" ? "bg-flare text-flare-foreground" : "bg-ink text-paper"}`}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest opacity-75">{eyebrow}</p>
            <h2 className="mt-3 display text-[clamp(2.8rem,7vw,7rem)] leading-[.86]">{title}<span className={tone === "flare" ? "text-ink" : "text-flare"}>.</span></h2>
          </div>
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest opacity-75">{intro}</p>
        </div>
        <p className="mt-7 font-mono text-xs font-bold uppercase tracking-widest">{items.length} {items.length === 1 ? "entry" : "entries"}</p>
      </header>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2">
          {items.map((item, index) => {
            const record = normalizeEditorialRecord(item as CmsRecord);
            const imageUrl = archiveImageUrl(record);
            return (
              <FadeIn key={item.slug} className={`border-b-2 border-ink ${index % 2 === 0 ? "md:border-r-2" : ""} ${index >= items.length - 2 ? "md:border-b-0" : ""}`}>
                <Link href={itemPath(item)} className="group/card block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare">
                  <MediaFrame tone={tone} aspect="aspect-[4/3] sm:aspect-[16/10]" className="bg-transparent" label={record.title} imageUrl={imageUrl} sizes="(min-width: 768px) 50vw, 100vw" reveal />
                  <div className="border-t-2 border-ink p-5 md:p-7">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{record.publishedAt || record.date || "RADAR"}{record.author ? ` / ${record.author}` : ""}</p>
                    <h3 className="mt-3 display max-w-[15ch] text-[clamp(1.8rem,4vw,4rem)] leading-[.94]">{record.title}</h3>
                    <p className="mt-4 max-w-xl font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{record.excerpt || "Editorial excerpt pending."}</p>
                    <span className="mt-6 inline-flex font-mono text-xs font-bold uppercase tracking-widest text-flare">Open magazine →</span>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      ) : (
        <p className="p-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">No episodes have been published in this lane yet.</p>
      )}
    </section>
  );
}

function sanitizeMagazineHtml(input: string) {
  const allowed = new Set(["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "b", "i", "blockquote", "ul", "ol", "li", "a", "figure", "figcaption", "img", "hr"]);
  return input.slice(0, 2_000_000)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(script|style|object|embed|form|svg|math|link|meta|noscript|iframe)[^>]*>/gi, "")
    .replace(/<([a-z0-9-]+)([^>]*)>/gi, (_, tag: string, attrs: string) => {
      const name = tag.toLowerCase();
      if (!allowed.has(name)) return "";
      if (name === "br" || name === "hr") return `<${name}>`;
      const kept = attrs.replace(/\s+([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g, (_match: string, key: string, _quote: string, value: string) => {
        const lower = key.toLowerCase();
        if (lower.startsWith("on") || lower === "style" || lower === "class" || lower === "id" || lower === "srcset") return "";
        if (lower === "href" || lower === "src") {
          if (/^javascript:/i.test(value.trim())) return "";
          if (lower === "src" && !/^https?:\/\//i.test(value.trim()) && !value.trim().startsWith("/")) return "";
          return ` ${lower}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`;
        }
        return ` ${lower}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`;
      });
      return `<${name}${kept}>`;
    });
}

function splitIntoPages(html: string) {
  const safe = sanitizeMagazineHtml(html);
  const blocks = safe.split(/(?=<(?:h[1-6]|p|figure|blockquote|ul|ol|hr)\b)/i).map((part) => part.trim()).filter(Boolean);
  const pages: string[] = [];
  for (let index = 0; index < blocks.length; index += 4) pages.push(blocks.slice(index, index + 4).join("\n"));
  return pages.length ? pages : [safe];
}

export function MagazineFlipbook({ title, excerpt, bodyHtml, imageUrl, author, backPath }: { title: string; excerpt: string; bodyHtml?: string; imageUrl?: string; author?: string; backPath: string }) {
  const pages = useMemo(() => splitIntoPages(bodyHtml || `<p>${excerpt}</p>`), [bodyHtml, excerpt]);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");
  const lastPage = pages.length;
  const atStart = page === 0;
  const atEnd = page === lastPage;

  const goToPage = useCallback((nextPage: number, direction: "next" | "prev") => {
    setFlipDirection(direction);
    setPage(Math.max(0, Math.min(lastPage, nextPage)));
  }, [lastPage]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
      if (!isOpen) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") goToPage(page + 1, "next");
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") goToPage(page - 1, "prev");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, isOpen]);

  const pageMarkup = (index: number) => index === 0
    ? <div className="flex h-full flex-col justify-center"><p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">The issue</p><h2 className="mt-5 display text-[clamp(2.7rem,7vw,7rem)] leading-[.84]">{title}<span className="text-flare">.</span></h2><p className="mt-6 max-w-md font-mono text-sm uppercase leading-relaxed text-muted-foreground">{excerpt}</p></div>
    : <div className="editorial-body magazine-page-body" dangerouslySetInnerHTML={{ __html: pages[index - 1] || "" }} />;

  return (
    <section className="relative min-h-[100svh] bg-ink px-2 py-3 text-paper sm:px-4 sm:py-6 md:px-8 md:py-10" aria-label={`${title} magazine reader`}>
      <style jsx global>{`@keyframes magazineFlipNext{0%{opacity:.25;transform:perspective(1800px) rotateY(-9deg) translateX(-1.5%);transform-origin:left center}45%{opacity:1;transform:perspective(1800px) rotateY(2deg) translateX(0)}100%{opacity:1;transform:perspective(1800px) rotateY(0) translateX(0)}}@keyframes magazineFlipPrev{0%{opacity:.25;transform:perspective(1800px) rotateY(9deg) translateX(1.5%);transform-origin:right center}45%{opacity:1;transform:perspective(1800px) rotateY(-2deg) translateX(0)}100%{opacity:1;transform:perspective(1800px) rotateY(0) translateX(0)}}@keyframes pageSheen{0%{opacity:0;transform:translateX(-120%)}35%{opacity:.35}100%{opacity:0;transform:translateX(220%)}}@keyframes pageSheenReverse{0%{opacity:0;transform:translateX(120%)}35%{opacity:.35}100%{opacity:0;transform:translateX(-220%)}}`}</style>
      <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-6xl flex-col sm:min-h-[calc(100svh-3rem)]">
        <div className="mb-2 flex items-center justify-between px-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-paper/70 sm:mb-3">
          <Link href={backPath} className="hover:text-flare">← Magazine</Link>
          <span>{author || "RADARCharts"}</span>
          {isOpen ? <button type="button" aria-label="Close issue" onClick={() => { setIsOpen(false); setPage(0); }} className="hover:text-flare"><X size={18} /></button> : <span aria-hidden="true" className="w-[18px]" />}
        </div>
        <div className={`relative mx-auto flex w-full flex-1 items-center justify-center ${isOpen ? "cursor-default" : "cursor-pointer"}`} onClick={() => !isOpen && setIsOpen(true)}>
          {!isOpen ? (
            <div className="relative aspect-[3/4] w-full max-w-[min(92vw,44rem)] overflow-hidden border-2 border-paper bg-flare text-ink shadow-[10px_10px_0_0_var(--flare)] sm:aspect-[2/3]">
              {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-multiply" /> : null}
              <div className="absolute inset-0 bg-gradient-to-br from-flare via-flare/90 to-ink/70" />
              <div className="relative flex h-full flex-col justify-between p-6 sm:p-10 md:p-14">
                <div className="flex justify-between gap-4 font-mono text-[10px] font-bold uppercase tracking-[.18em]"><span>RADAR / Magazine</span><span>Vol. 01</span></div>
                <div><p className="font-mono text-xs font-bold uppercase tracking-widest">{author || "RADARCharts by REM"}</p><h1 className="mt-5 display text-[clamp(3rem,10vw,8rem)] leading-[.8]">{title}<span className="text-paper">.</span></h1><p className="mt-7 max-w-md font-mono text-xs uppercase leading-relaxed sm:text-sm">{excerpt}</p></div>
                <div className="border-t-2 border-ink pt-4 font-mono text-[10px] font-bold uppercase tracking-widest">Tap to open issue →</div>
              </div>
            </div>
          ) : (
            <div className="relative flex h-[min(78svh,54rem)] w-full max-w-6xl overflow-hidden border-2 border-paper bg-paper text-ink shadow-[10px_10px_0_0_var(--flare),0_24px_60px_rgba(0,0,0,.4)] [transform-style:preserve-3d]">
              <div key={`${page}-${flipDirection}`} className={`relative z-[1] flex min-w-0 flex-1 animate-[${flipDirection === "next" ? "magazineFlipNext" : "magazineFlipPrev"}_520ms_cubic-bezier(.22,.61,.36,1)] bg-paper shadow-[inset_0_0_24px_rgba(0,0,0,.08)]`}>
                <button type="button" aria-label="Previous page" onClick={(event) => { event.stopPropagation(); goToPage(page - 1, "prev"); }} disabled={atStart} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-ink bg-paper/85 p-2 shadow-[2px_3px_0_rgba(0,0,0,.18)] transition hover:bg-flare disabled:opacity-20 sm:left-4 sm:p-3"><ChevronLeft size={18} /></button>
                <div className="relative min-w-0 flex-1 p-6 sm:p-10 md:border-r-2 md:border-ink md:p-14"><div className="mb-8 flex justify-between border-b-2 border-ink pb-3 font-mono text-[10px] font-bold uppercase tracking-widest"><span>RADAR / Magazine</span><span>{page === 0 ? "Cover" : `${page} / ${lastPage}`}</span></div>{pageMarkup(page)}<span className="absolute bottom-5 left-6 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:left-10">{page === 0 ? "RADARCharts" : `Page ${page}`}</span></div>
                <div className="hidden min-w-0 flex-1 p-14 md:block">{pageMarkup(Math.min(lastPage, page + 1))}<span className="absolute bottom-5 right-14 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{page + 1 >= lastPage ? "RADARCharts" : `Page ${page + 1}`}</span></div>
                <button type="button" aria-label="Next page" onClick={(event) => { event.stopPropagation(); goToPage(page + 1, "next"); }} disabled={atEnd} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-ink bg-paper/85 p-2 shadow-[2px_3px_0_rgba(0,0,0,.18)] transition hover:bg-flare disabled:opacity-20 sm:right-4 sm:p-3"><ChevronRight size={18} /></button>
              </div>
              <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 z-[2] w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 ${flipDirection === "next" ? "left-0 animate-[pageSheen_520ms_ease-out]" : "right-0 animate-[pageSheenReverse_520ms_ease-out]"}`} />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-paper/70 sm:mt-4">
          {isOpen ? <><span>{page === 0 ? "Cover" : `Page ${page} / ${lastPage}`}</span><span aria-hidden="true">·</span><span>Swipe or use arrows</span></> : <span>Portrait reading mode</span>}
        </div>
      </div>
    </section>
  );
}
