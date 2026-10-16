"use client";

import { useEffect, useRef, useState } from "react";
import type { ZumzyStat } from "@/data/zumzy-brown";

/**
 * Animated catalogue counters. Figures come from the data module (never
 * hard-coded here). The animation:
 *  - starts only when the element enters the viewport,
 *  - plays once (no replay on re-entry),
 *  - eases smoothly,
 *  - respects prefers-reduced-motion (renders the final value immediately),
 *  - renders the true value in SSR/JS-failure contexts (final value is the
 *    initial render; the count-up is a client-only enhancement).
 */
function CountUp({ value }: { value: number }) {
  // Initial render already shows the final value, so reduced-motion and
  // no-JS contexts are correct without any synchronous effect state writes.
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const playedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || playedRef.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      // display already equals value — nothing to animate or reset.
      playedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        playedRef.current = true;

        const duration = 1600;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 4); // easeOutQuart
          setDisplay(Math.round(eased * value));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <>
      <span ref={ref} aria-hidden="true">{display.toLocaleString("en-US")}</span>
      <span className="sr-only">{value.toLocaleString("en-US")}</span>
    </>
  );
}

export function CatalogueCounters({ stats }: { stats: ZumzyStat[] }) {
  return (
    <ul className="grid grid-cols-2 gap-px border-2 border-ink bg-ink md:grid-cols-4">
      {stats.map((stat) => (
        <li key={stat.key} data-testid={`stat-${stat.key}`} className="bg-paper p-5 sm:p-6">
          <p className="display text-[clamp(2.6rem,6vw,4.6rem)] text-ink">
            <CountUp value={stat.value} />
          </p>
          <p className="mt-2 font-mono text-[10px] font-bold uppercase leading-snug tracking-widest text-ink/80">
            {stat.label}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{stat.method}</p>
        </li>
      ))}
    </ul>
  );
}
