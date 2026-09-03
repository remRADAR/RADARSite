"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

type CursorContextValue = {
  setLabel: (label: string | null) => void;
};

const CursorContext = createContext<CursorContextValue>({ setLabel: () => {} });

export const useCursor = () => useContext(CursorContext);

/**
 * Minimal custom cursor: a small blend-difference dot that lag-follows the
 * pointer and expands into a thin ring over interactive media — no filled
 * disc, no label, so it never covers content. Hidden on touch / reduced-motion.
 * `setLabel` is kept for API compatibility; a non-null value just signals the
 * "interactive" (ring) state.
 */
export function CursorProvider({ children }: { children: React.ReactNode }) {
  const [interactive, setInteractive] = useState(false);
  const [active, setActive] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
    const dot = dotRef.current;
    if (!dot) return;

    gsap.set(dot, { xPercent: -50, yPercent: -50 });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.18, ease: "power3" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.18, ease: "power3" });

    const move = (e: MouseEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const setLabel = (label: string | null) => setInteractive(Boolean(label));

  return (
    <CursorContext.Provider value={{ setLabel }}>
      {children}
      {active && (
        <div
          ref={dotRef}
          aria-hidden
          className={`pointer-events-none fixed left-0 top-0 z-[100] rounded-full mix-blend-difference transition-[height,width,border-width,background-color] duration-300 ease-[var(--ease-out)] ${
            interactive ? "h-9 w-9 border-2 border-white bg-transparent" : "h-2.5 w-2.5 bg-white"
          }`}
        />
      )}
    </CursorContext.Provider>
  );
}
