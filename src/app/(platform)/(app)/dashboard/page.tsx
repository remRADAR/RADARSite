import { ProjectCard } from "@/components/platform/ProjectCard";
import { FadeIn } from "@/components/motion/FadeIn";
import { projects } from "@/data/projects";

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="brut-border bg-paper p-6">
      <p className="display text-[clamp(3rem,6vw,4.5rem)] leading-none text-flare">{value}</p>
      <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const active = projects.filter((p) => p.status !== "Delivered");
  const upcoming = projects
    .flatMap((p) => p.milestones.filter((m) => !m.done).map((m) => ({ ...m, project: p.name })))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div>
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        (Dashboard)
      </p>
      <h1 className="mt-3 display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">
        Welcome back,
        <br />
        Priya<span className="text-flare">.</span>
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryStat label="Active projects" value={String(active.length)} />
        <SummaryStat label="Briefs in review" value="02" />
        <SummaryStat label="Upcoming milestones" value={String(upcoming.length).padStart(2, "0")} />
      </div>

      <div className="mt-14">
        <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest">
          → Current projects
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {active.map((p, i) => (
            <FadeIn key={p.id} delay={i * 0.06}>
              <ProjectCard project={p} />
            </FadeIn>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest">
          → Next milestones
        </h2>
        <ul className="brut-border bg-paper">
          {upcoming.map((m, i) => (
            <li
              key={`${m.project}-${m.label}`}
              className={`flex items-center justify-between gap-4 p-4 font-mono text-sm ${
                i < upcoming.length - 1 ? "border-b-2 border-ink" : ""
              }`}
            >
              <span className="uppercase tracking-wide">
                {m.label} <span className="text-muted-foreground">— {m.project}</span>
              </span>
              <span className="shrink-0 font-bold">{m.date}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
