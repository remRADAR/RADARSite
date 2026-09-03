import { FadeIn } from "@/components/motion/FadeIn";

export function CaseBrief({ brief }: { brief: string }) {
  return (
    <section className="brut-border-t bg-paper">
      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr]">
        <div className="border-b-2 border-ink p-4 md:border-b-0 md:border-r-2 md:p-8">
          <p className="font-mono text-xs font-bold uppercase tracking-widest">
            (01) The Challenge
          </p>
        </div>
        <FadeIn className="p-4 py-14 md:p-12 md:py-24">
          <p className="max-w-[24ch] display text-[clamp(1.5rem,3.5vw,3.25rem)] leading-[1.02]">
            {brief}
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
