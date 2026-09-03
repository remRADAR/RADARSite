"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type MagneticProps = {
  children: React.ReactNode;
  strength?: number;
  className?: string;
};

/**
 * Pulls its child toward the pointer while hovered, springing back on leave —
 * the classic tactile "magnetic" button micro-interaction. No-ops under
 * reduced-motion / touch. Always renders an inline-block wrapper span.
 */
export function Magnetic({ children, strength = 0.4, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={["inline-block", className].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}
