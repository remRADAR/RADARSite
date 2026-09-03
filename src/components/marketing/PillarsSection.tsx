import { FadeIn } from "@/components/motion/FadeIn";

const PILLARS = [
  { number: "01", label: "Brand", description: "Identity systems built to survive contact with the real world." },
  { number: "02", label: "Film", description: "Campaign and brand film, shot and cut in-house." },
  { number: "03", label: "Product", description: "Digital product and packaging, concept to production." },
  { number: "04", label: "Culture", description: "Internal brand, culture, and studio-facing work." },
];

export function PillarsSection() {
  return (
    <section className="bg-paper">
      <div className="flex items-end justify-between px-4 py-8 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">
          (02) What we do
        </p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Capabilities
        </p>
      </div>

      <div className="brut-border-t">
        {PILLARS.map((pillar) => (
          <FadeIn key={pillar.number}>
            <div className="group brut-border-b relative overflow-hidden">
              {/* Flare wipe that fills the row on hover. */}
              <div className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-flare transition-transform duration-500 ease-[var(--ease-slam)] group-hover:scale-x-100" />
              <div className="relative flex flex-col gap-3 px-4 py-8 md:grid md:grid-cols-[8rem_1fr_28rem] md:items-center md:gap-8 md:px-8 md:py-10">
                <span className="font-mono text-sm font-bold">{pillar.number}</span>
                <h3 className="display text-[clamp(2.5rem,7vw,6rem)] leading-none">
                  {pillar.label}
                </h3>
                <p className="font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground group-hover:text-ink md:text-right">
                  {pillar.description}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
