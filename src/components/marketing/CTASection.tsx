import { FadeIn } from "@/components/motion/FadeIn";
import { Magnetic } from "@/components/motion/Magnetic";

export function CTASection() {
  return (
    <section className="on-dark bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-6 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(05) Start</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Let&rsquo;s talk
        </p>
      </div>

      <FadeIn className="border-t-2 border-paper px-4 py-20 md:px-8 md:py-32">
        <h2 className="display text-[clamp(3rem,11vw,12rem)] leading-[0.85]">
          Let&rsquo;s make
          <br />
          something
          <br />
          <span className="text-flare">worth</span> talking
          <br />
          about.
        </h2>

        <div className="mt-14">
          <Magnetic strength={0.5}>
            <a
              href="mailto:hello@northlight.studio"
              className="inline-flex items-center gap-4 brut-border border-paper bg-flare px-8 py-5 font-mono text-sm font-bold uppercase tracking-widest text-flare-foreground transition-transform hover:-translate-y-1"
            >
              hello@northlight.studio
              <span aria-hidden>↗</span>
            </a>
          </Magnetic>
        </div>
      </FadeIn>
    </section>
  );
}
