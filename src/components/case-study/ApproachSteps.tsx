"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils";
import type { ApproachStep } from "@/lib/case-studies";

gsap.registerPlugin(ScrollTrigger);

/** Pinned moment: steps cross-fade/slide as the section pins. */
export function ApproachSteps({ steps }: { steps: ApproachStep[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
      const els = stepRefs.current.filter(Boolean) as HTMLDivElement[];
      if (els.length < 2) return;

      gsap.set(els, { autoAlpha: 0, xPercent: 6 });
      gsap.set(els[0], { autoAlpha: 1, xPercent: 0 });

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => `+=${(els.length - 1) * 70}%`,
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress * (els.length - 1);
          const index = Math.min(els.length - 1, Math.floor(progress));
          const local = progress - index;

          els.forEach((el, i) => {
            if (i === index) gsap.set(el, { autoAlpha: 1 - local, xPercent: -local * 6 });
            else if (i === index + 1) gsap.set(el, { autoAlpha: local, xPercent: (1 - local) * 6 });
            else gsap.set(el, { autoAlpha: 0, xPercent: 6 });
          });
        },
      });

      return () => st.kill();
    });

    return () => mm.revert();
  }, [steps.length]);

  return (
    <section className="on-dark brut-border-t bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-5 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(02) The Approach</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Process
        </p>
      </div>

      {/* Mobile / reduced-motion: stacked list. */}
      <div className="flex flex-col border-t-2 border-paper md:hidden">
        {steps.map((step, i) => (
          <FadeIn key={step.label} className="border-b-2 border-paper px-4 py-10">
            <span className="font-mono text-sm font-bold text-flare">
              0{i + 1} / 0{steps.length}
            </span>
            <p className="mt-3 display text-[clamp(2.5rem,10vw,4rem)]">{step.label}</p>
            <p className="mt-4 max-w-md font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
              {step.description}
            </p>
          </FadeIn>
        ))}
      </div>

      {/* Desktop: pinned cross-fade sequence. */}
      <div
        ref={sectionRef}
        className="relative hidden h-[100svh] w-full items-center overflow-hidden border-t-2 border-paper md:flex"
      >
        <div className="w-full px-8">
          <div className="relative h-[46vh]">
            {steps.map((step, i) => (
              <div
                key={step.label}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className={cn("absolute inset-0 flex flex-col justify-center", i !== 0 && "invisible")}
              >
                <span className="font-mono text-lg font-bold text-flare">
                  0{i + 1} / 0{steps.length}
                </span>
                <h3 className="mt-4 display text-[clamp(4rem,12vw,11rem)]">{step.label}</h3>
                <p className="mt-6 max-w-xl font-mono text-lg uppercase leading-relaxed tracking-wide text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
