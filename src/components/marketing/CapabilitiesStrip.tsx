import { FadeIn } from "@/components/motion/FadeIn";

const STEPS = [
  { n: "01", label: "Strategy" },
  { n: "02", label: "Craft" },
  { n: "03", label: "Production" },
  { n: "04", label: "Launch" },
];

export function CapabilitiesStrip() {
  return (
    <section className="on-dark bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-6 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(03) How we work</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          The process
        </p>
      </div>
      <div className="grid grid-cols-1 border-t-2 border-paper md:grid-cols-4">
        {STEPS.map((step, i) => (
          <FadeIn
            key={step.n}
            delay={i * 0.08}
            className={
              i < STEPS.length - 1 ? "border-b-2 border-paper md:border-b-0 md:border-r-2" : ""
            }
          >
            <div className="group flex h-full flex-col justify-between gap-16 px-4 py-8 transition-colors hover:bg-flare hover:text-flare-foreground md:px-6 md:py-10">
              <span className="font-mono text-sm font-bold">{step.n}</span>
              <span className="display text-[clamp(2rem,4vw,3.5rem)] leading-none">
                {step.label}
                <span className="text-flare group-hover:text-flare-foreground">.</span>
              </span>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
