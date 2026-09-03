import { FadeIn } from "@/components/motion/FadeIn";

export function CreditsBlock({ credits }: { credits: { role: string; name: string }[] }) {
  return (
    <FadeIn className="brut-border-t bg-paper">
      <div className="flex items-center justify-between px-4 py-5 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(05) Credits</p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Collaborators
        </p>
      </div>
      <dl className="grid grid-cols-1 border-t-2 border-ink md:grid-cols-2">
        {credits.map((c, i) => (
          <div
            key={c.role}
            className={`flex items-baseline justify-between gap-4 border-b-2 border-ink px-4 py-4 md:px-8 ${
              i % 2 === 0 ? "md:border-r-2" : ""
            }`}
          >
            <dt className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {c.role}
            </dt>
            <dd className="font-mono text-sm font-bold uppercase tracking-wide">{c.name}</dd>
          </div>
        ))}
      </dl>
    </FadeIn>
  );
}
