import { FadeIn } from "@/components/motion/FadeIn";
import { Magnetic } from "@/components/motion/Magnetic";
import { homepageContent } from "@/lib/radar-content";

export function CTASection() {
  const { cta } = homepageContent;
  return (
    <section className="on-dark bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-6 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(05) Start</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Put it on the RADAR
        </p>
      </div>

      <FadeIn className="border-t-2 border-paper px-4 py-20 md:px-8 md:py-32">
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
              className="inline-flex items-center gap-4 brut-border border-paper bg-flare px-8 py-5 font-mono text-sm font-bold uppercase tracking-widest text-flare-foreground transition-transform hover:-translate-y-1"
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
