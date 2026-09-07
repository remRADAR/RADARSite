import { FadeIn } from "@/components/motion/FadeIn";
import { homepageContent } from "@/lib/radar-content";

export function PillarsSection() {
  return (
    <section className="bg-paper">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 px-4 py-8 md:grid-cols-[8rem_minmax(0,1fr)_28rem] md:gap-8 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest md:col-span-2">(02) AKT!V</p>
        <p className="font-mono text-right text-xs font-bold uppercase tracking-widest text-muted-foreground md:text-left">ECOSYSTEM</p>
      </div>
      <div className="brut-border-t">
        {homepageContent.pillars.map((pillar) => (
          <FadeIn key={pillar.number}>
            <div className="group brut-border-b relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-flare transition-transform duration-500 ease-[var(--ease-slam)] group-hover:scale-x-100" />
              <div className="relative grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-6 md:grid-cols-[8rem_minmax(0,1fr)_28rem] md:gap-8 md:px-8 md:py-10">
                <span className="whitespace-nowrap font-mono text-[clamp(.55rem,1.8vw,.875rem)] font-bold">{pillar.number}</span>
                <h3 className="display min-w-0 whitespace-nowrap !text-[clamp(1.45rem,7vw,6rem)] ![overflow-wrap:normal] ![word-break:keep-all] leading-none">{pillar.label}</h3>
                <p className="col-start-2 min-w-0 font-mono text-[clamp(.6rem,1.5vw,.875rem)] uppercase leading-tight tracking-[.02em] text-muted-foreground group-hover:text-ink md:col-start-auto md:whitespace-nowrap md:leading-none">{pillar.description}</p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
