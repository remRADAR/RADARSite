"use client";

import { ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ParallaxImageProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

export function ParallaxImage({ children, className, strength = 14 }: ParallaxImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        inner,
        { yPercent: -strength },
        {
          yPercent: strength,
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    return () => mm.revert();
  }, [strength]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className ?? ""}`}>
      <div ref={innerRef} className="absolute inset-x-0 -top-[15%] h-[130%]">
        {children}
      </div>
    </div>
  );
}
