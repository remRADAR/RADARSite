import { BriefForm } from "@/components/platform/BriefForm";

export default function NewBriefPage() {
  return (
    <div>
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        (New brief)
      </p>
      <h1 className="mt-3 display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">
        Start a brief<span className="text-flare">.</span>
      </h1>
      <p className="mt-4 max-w-lg font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">
        Three short steps. We&rsquo;ll follow up within one business day.
      </p>

      <div className="mt-12">
        <BriefForm />
      </div>
    </div>
  );
}
