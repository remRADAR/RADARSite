"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FadeIn } from "@/components/motion/FadeIn";
import { EASE, DURATION } from "@/lib/motion";
import type { ResultStat } from "@/lib/case-studies";

gsap.registerPlugin(ScrollTrigger);

function parseStat(value: string) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, numStr, suffix] = match;
  const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
  return { target: parseFloat(numStr), decimals, suffix };
}

function CountUpStat({ value, delay }: { value: string; delay: number }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parsed = parseStat(value);
    if (!el || !parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const proxy = { val: 0 };
    const tween = gsap.to(proxy, {
      val: parsed.target,
      duration: DURATION.cinematic,
      delay,
      ease: EASE.out,
      onUpdate: () => {
        el.textContent = proxy.val.toFixed(parsed.decimals) + parsed.suffix;
      },
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });

    return () => {
      tween.kill();
    };
  }, [value, delay]);

  return (
    <p ref={ref} className="display text-[clamp(4rem,11vw,10rem)] leading-none text-flare">
      {value}
    </p>
  );
}

export function ResultsRow({ results }: { results: ResultStat[] }) {
  return (
    <section className="on-dark brut-border-t bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-5 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(04) Results</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Outcome
        </p>
      </div>
      <div className="grid grid-cols-1 border-t-2 border-paper md:grid-cols-3">
        {results.map((r, i) => (
          <FadeIn
            key={r.label}
            delay={i * 0.08}
            className={cnResult(i, results.length)}
          >
            <CountUpStat value={r.value} delay={i * 0.08} />
            <p className="mt-6 max-w-[26ch] font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
              {r.label}
            </p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

function cnResult(i: number, total: number) {
  const last = i === total - 1;
  return `p-6 md:p-10 ${last ? "" : "border-b-2 md:border-b-0 md:border-r-2 border-paper"}`;
}
