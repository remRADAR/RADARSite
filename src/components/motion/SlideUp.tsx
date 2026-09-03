"use client";

import { ReactNode } from "react";
import { useScrollReveal } from "@/lib/useScrollReveal";
import { DURATION } from "@/lib/motion";

type SlideUpProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Larger-travel reveal for headings/titles — same easing system as FadeIn, more presence. */
export function SlideUp({ children, className, delay }: SlideUpProps) {
  const ref = useScrollReveal<HTMLDivElement>({ y: 40, duration: DURATION.slow, delay });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
