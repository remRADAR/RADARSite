"use client";

import { FadeIn } from "@/components/motion/FadeIn";
import { Magnetic } from "@/components/motion/Magnetic";
import { useSiteConfig } from "@/lib/site-config-context";

export function CTASection() {
  const { config } = useSiteConfig();
  const cta = { headline: config.homepage.ctaSection.headline.split(" "), email: config.homepage.ctaSection.contactEmail };
  return (
    <section className="on-dark relative isolate overflow-hidden bg-ink text-paper">
      <img
        src="/media/homepage-cta.gif"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-75"
      />
      <div className="pointer-events-none absolute inset-0 bg-ink/45" aria-hidden="true" />

      <div className="relative z-10 flex items-center justify-between px-4 py-6 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(05) Start</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Put it on the RADAR
        </p>
      </div>

      <FadeIn className="relative z-10 border-t-2 border-paper px-4 py-20 md:px-8 md:py-32">
        <h2 className="display text-[clamp(3rem,11vw,12rem)] leading-[0.85]">
          {cta.headline.map((line, index) => (
            <span key={line} className="block">
              {index === cta.headline.length - 1 ? <span className="text-flare">{line}</span> : line}
            </span>
          ))}
        </h2>

        <div className="mt-14">
          <Magnetic strength={0.5}>
            <a
              href={`mailto:${cta.email}`}
              className="inline-flex max-w-full items-center gap-4 whitespace-normal brut-border border-paper bg-flare px-5 py-5 text-left font-mono text-sm font-bold uppercase tracking-widest text-flare-foreground transition-transform hover:-translate-y-1 sm:px-8"
            >
              {cta.email}
              <span aria-hidden>↗</span>
            </a>
          </Magnetic>
        </div>
      </FadeIn>
    </section>
  );
}
