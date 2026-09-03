"use client";

import Link from "next/link";
import { useBriefs } from "@/lib/briefs-context";

export default function BriefsPage() {
  const { briefs } = useBriefs();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
            (Briefs)
          </p>
          <h1 className="mt-3 display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">
            Submitted<span className="text-flare">.</span>
          </h1>
        </div>
        <Link
          href="/briefs/new"
          className="brut-border bg-flare px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground transition-colors hover:bg-ink hover:text-paper"
        >
          + New brief
        </Link>
      </div>

      <ul className="mt-10 brut-border bg-paper" data-testid="briefs-list">
        {briefs.map((b, i) => (
          <li
            key={b.id}
            className={`flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between ${
              i < briefs.length - 1 ? "border-b-2 border-ink" : ""
            }`}
            data-testid="brief-item"
          >
            <div>
              <p className="display text-xl">{b.title}</p>
              <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {b.projectType} · {b.budgetRange} · {b.timeline}
              </p>
            </div>
            <span className="w-fit bg-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-paper">
              {b.status} — {b.submittedAt}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
