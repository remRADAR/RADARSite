import { notFound } from "next/navigation";
import { getProject, projects } from "@/data/projects";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { MediaFrame } from "@/components/MediaFrame";

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {project.client}
          </p>
          <h1 className="mt-2 display text-[clamp(2.25rem,5vw,3.75rem)] leading-none">
            {project.name}
          </h1>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-4 max-w-2xl font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">
        {project.summary}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest">
            → Milestones
          </h2>
          <ul className="brut-border bg-paper">
            {project.milestones.map((m, i) => (
              <li
                key={m.label}
                className={`flex items-center justify-between gap-4 p-4 ${
                  i < project.milestones.length - 1 ? "border-b-2 border-ink" : ""
                }`}
              >
                <span className="flex items-center gap-3 font-mono text-sm uppercase tracking-wide">
                  <span
                    className={`h-3 w-3 ${m.done ? "bg-flare" : "border-2 border-ink bg-paper"}`}
                    aria-hidden
                  />
                  <span className={m.done ? "text-ink" : "text-muted-foreground"}>{m.label}</span>
                </span>
                <span className="font-mono text-xs font-bold text-muted-foreground">{m.date}</span>
              </li>
            ))}
          </ul>

          <h2 className="mb-4 mt-12 font-mono text-xs font-bold uppercase tracking-widest">
            → WIP frame
          </h2>
          <div className="group/card brut-border">
            <MediaFrame tone="mono" aspect="aspect-video" label={`${project.name} — latest cut`} reveal />
          </div>
        </div>

        <aside className="flex flex-col gap-8">
          <div>
            <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-widest">
              → Deliverables
            </h2>
            <ul className="flex flex-col gap-2">
              {project.deliverables.map((d) => (
                <li key={d} className="brut-border bg-paper px-4 py-3 font-mono text-xs uppercase tracking-wide">
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="brut-border bg-paper p-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Main contact
            </p>
            <p className="mt-2 font-mono text-sm uppercase tracking-wide">{project.mainContact}</p>
            <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Deadline
            </p>
            <p className="mt-2 font-mono text-sm uppercase tracking-wide">{project.deadline}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
