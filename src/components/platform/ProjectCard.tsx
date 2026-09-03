import Link from "next/link";
import { StatusBadge } from "@/components/platform/StatusBadge";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block brut-border bg-paper p-6 transition-all hover:brut-shadow hover:-translate-x-1 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {project.client}
          </p>
          <h3 className="mt-1 display text-2xl">{project.name}</h3>
        </div>
        <StatusBadge status={project.status} />
      </div>
      <p className="mt-4 font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">
        {project.summary}
      </p>
      <div className="mt-6">
        <div className="h-3 w-full border-2 border-ink bg-paper">
          <div className="h-full bg-flare" style={{ width: `${project.progress}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>{project.progress}% complete</span>
          <span>Due {project.deadline}</span>
        </div>
      </div>
    </Link>
  );
}
