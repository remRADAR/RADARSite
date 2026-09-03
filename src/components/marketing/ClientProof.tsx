import { FadeIn } from "@/components/motion/FadeIn";
import { DragCarousel } from "@/components/motion/DragCarousel";

const CLIENTS = [
  "Halcyon",
  "Vantage Motors",
  "Kestrel",
  "Meridian Financial",
  "Ardent Bottle Works",
  "Roadhouse Films",
];

export function ClientProof() {
  return (
    <section className="bg-paper">
      <div className="flex items-center justify-between px-4 py-6 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(04) Proof</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Trusted by
        </p>
      </div>

      <div className="brut-border-t brut-border-b px-4 py-16 md:px-8 md:py-24">
        <FadeIn>
          <blockquote className="max-w-5xl display text-[clamp(1.75rem,4.5vw,4rem)] leading-[0.98]">
            &ldquo;They didn&rsquo;t just redesign the bottle — they figured out what we
            were <span className="bg-flare px-2 text-flare-foreground">actually</span> trying to
            say, and said it better than we could have.&rdquo;
          </blockquote>
          <p className="mt-8 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            → Priya Nair, VP Marketing — Halcyon Distilling Co.
          </p>
        </FadeIn>
      </div>

      <FadeIn>
        {/* Rendered twice so the strip always overflows and stays drag-scrollable
            (and reads like a repeating logo ticker). */}
        <DragCarousel className="px-4 py-8 md:px-8">
          {[...CLIENTS, ...CLIENTS].map((client, i) => (
            <span
              key={`${client}-${i}`}
              className="flex h-20 shrink-0 select-none items-center brut-border bg-paper px-10 font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:bg-ink hover:text-paper"
            >
              {client}
            </span>
          ))}
        </DragCarousel>
      </FadeIn>
    </section>
  );
}
