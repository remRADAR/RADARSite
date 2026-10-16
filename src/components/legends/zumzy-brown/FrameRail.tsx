"use client";

import { useEffect, useState } from "react";

const FRAMES = [
  { id: "frame-legend", label: "The Legend", index: "01" },
  { id: "frame-sound", label: "The Sound", index: "02" },
  { id: "frame-legacy", label: "The Legacy", index: "03" },
] as const;

/**
 * Persistent three-frame progress/navigation rail. Uses an IntersectionObserver
 * scroll-spy so navigation always reflects the active frame, and plain anchors
 * so keyboard and touch users keep full control — no scroll hijacking.
 */
export function FrameRail() {
  const [active, setActive] = useState<string>(FRAMES[0].id);

  useEffect(() => {
    const sections = FRAMES.map((frame) => document.getElementById(frame.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Legend Forever frames"
      className="fixed bottom-4 right-4 z-40 md:bottom-auto md:left-auto md:right-6 md:top-1/2 md:-translate-y-1/2 md:translate-x-0"
    >
      <ul className="brut-shadow flex items-center gap-1 border-2 border-ink bg-paper px-1.5 py-1.5 md:flex-col md:items-end md:gap-2 md:px-3 md:py-3">
        {FRAMES.map((frame) => {
          const isActive = active === frame.id;
          return (
            <li key={frame.id}>
              <a
                href={"#" + frame.id}
                aria-current={isActive ? "true" : undefined}
                className="flex items-center gap-2 px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-flare md:text-[10px]"
              >
                <span
                  aria-hidden
                  className={
                    isActive
                      ? "inline-block h-2.5 w-2.5 bg-ink transition-transform duration-500 ease-[var(--ease-out)] md:scale-110"
                      : "inline-block h-2.5 w-2.5 border border-ink/50 bg-transparent transition-colors"
                  }
                />
                <span className={isActive ? "opacity-100" : "opacity-55"}>{frame.index}</span>
                <span className={isActive ? "opacity-100" : "hidden md:inline opacity-55"}>{frame.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
