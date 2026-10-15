"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FadeIn } from "@/components/motion/FadeIn";
import { Marquee } from "@/components/motion/Marquee";
import { MediaFrame } from "@/components/MediaFrame";
import { useCursor } from "@/components/motion/CursorProvider";
import { cn } from "@/lib/utils";
import type { EditorialTreePost } from "@/lib/editorial-tree";

gsap.registerPlugin(ScrollTrigger);

type EditorialTreeEntryProps = {
  post: EditorialTreePost;
  index: number;
  reverse?: boolean;
  className?: string;
};

/**
 * A single editorial post entry — split layout matching the brutalist
 * SelectedWork / WorkEntry visual language, but driven entirely by CMS data.
 */
function EditorialTreeEntry({ post, index, reverse, className }: EditorialTreeEntryProps) {
  const { setLabel } = useCursor();
  const displayNumber = String(index + 1).padStart(2, "0");
  const metaLine = post.year + " / " + post.sectionLabel;
  const authorLine = post.author + " / " + post.sectionLabel;

  return (
    <Link
      href={post.destinationUrl}
      onMouseEnter={() => setLabel("Read")}
      onMouseLeave={() => setLabel(null)}
      className={cn("group/card group/media grid h-full grid-cols-1 md:grid-cols-2", className)}
    >
      {/* Featured image panel */}
      <div
        className={cn(
          "relative h-full min-h-[46vh] overflow-hidden brut-border-b md:min-h-0 md:border-b-0",
          reverse ? "md:order-2 md:border-l-2 md:border-ink" : "md:border-r-2 md:border-ink"
        )}
      >
        <MediaFrame
          tone={post.tone}
          aspect="aspect-auto"
          className="h-full w-full"
          label={post.sectionLabel}
          imageUrl={post.imageUrl || undefined}
          attribution={false}
          reveal
          sizes="(min-width: 768px) 50vw, 100vw"
          priority={index === 0}
        />
      </div>

      {/* Text panel */}
      <div
        className={cn(
          "flex min-w-0 flex-col justify-between gap-8 overflow-hidden px-4 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12",
          reverse && "md:order-1"
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <span className="display text-[clamp(3rem,8vw,7rem)] leading-none text-flare">
            {displayNumber}
          </span>
          <span className="shrink-0 whitespace-nowrap text-right font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground md:text-xs md:tracking-widest">
            {metaLine}
          </span>
        </div>

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {authorLine}
          </p>
          <h3 className="mt-3 max-w-full display text-[clamp(2rem,4.5vw,4rem)] leading-[0.92]">
            {post.title}
          </h3>
          <p className="mt-5 max-w-md font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
            {post.excerpt}
          </p>
          <span className="mt-8 inline-flex items-center gap-3 brut-border bg-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-paper transition-colors group-hover/media:bg-flare group-hover/media:text-flare-foreground">
            Read article
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

type EditorialTreeProps = {
  posts: EditorialTreePost[];
};

/**
 * Editorial Tree — the homepage section that highlights recent editorial posts.
 *
 * The "tree" mechanism: posts are fetched server-side from the CMS (sorted
 * newest-first). Every new published article automatically appears here on
 * the next revalidation — no manual updates, no hardcoded content.
 *
 * Desktop: pins the section and crossfades between full-bleed entries as the
 * user scrolls (same pattern as SelectedWork).
 * Mobile: stacked list with scroll-reveal animations.
 */
export function EditorialTree({ posts }: EditorialTreeProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const entryRefs = useRef<(HTMLDivElement | null)[]>([]);

  const visiblePosts = useMemo(() => posts.filter(Boolean), [posts]);
  const visibleKey = visiblePosts.map((p) => p.slug).join("|");

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
      const entries = entryRefs.current.filter(Boolean) as HTMLDivElement[];
      if (entries.length < 2) return;

      gsap.set(entries, { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(entries[0], { autoAlpha: 1, pointerEvents: "auto" });

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + Math.max(1, entries.length - 1) * window.innerHeight,
        pin: true,
        anticipatePin: 1,
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress * (entries.length - 1);
          const index = Math.min(entries.length - 1, Math.floor(progress));
          const local = progress - index;
          const dominant = local < 0.5 ? index : Math.min(index + 1, entries.length - 1);

          entries.forEach((el, i) => {
            let alpha = 0;
            if (i === index) alpha = 1 - local;
            else if (i === index + 1) alpha = local;
            gsap.set(el, { autoAlpha: alpha, pointerEvents: i === dominant ? "auto" : "none" });
          });
        },
      });
      requestAnimationFrame(() => ScrollTrigger.refresh());

      return () => {
        st.kill();
        gsap.set(entries, { clearProps: "all" });
      };
    });

    return () => mm.revert();
  }, [visibleKey]);

  if (visiblePosts.length === 0) return null;

  // Build ticker items from post section labels.
  const tickerItems = visiblePosts.map((p) => p.sectionLabel);

  return (
    <section className="bg-paper">
      {/* Section header with ticker */}
      <div className="brut-border-b bg-paper text-ink">
        <Marquee durationSeconds={30} reverse className="py-3">
          <span className="ml-0 mr-6 display whitespace-nowrap text-2xl">RADARArticles</span>
          {tickerItems.map((label, i) => (
            <span key={label + "-" + i} className="mx-6 display whitespace-nowrap text-2xl text-flare">
              {label}
            </span>
          ))}
          <span className="mx-6 text-flare">✳</span>
        </Marquee>
      </div>

      {/* Mobile / reduced-motion: stacked list */}
      <div className="flex flex-col md:hidden">
        {visiblePosts.map((post, i) => (
          <FadeIn key={post.slug}>
            <EditorialTreeEntry post={post} index={i} reverse={i % 2 === 1} />
          </FadeIn>
        ))}
      </div>

      {/* Desktop: pinned crossfade sequence */}
      <div
        ref={sectionRef}
        className="relative hidden h-[calc(100svh-3.625rem)] min-h-[34rem] w-full overflow-hidden md:block"
      >
        {visiblePosts.map((post, i) => (
          <div
            key={post.slug}
            ref={(el) => {
              entryRefs.current[i] = el;
            }}
            className={cn("pointer-events-none absolute inset-0", i !== 0 && "invisible")}
          >
            <EditorialTreeEntry
              post={post}
              index={i}
              reverse={i % 2 === 1}
              className="h-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
