import { ProjectCard } from "@/components/platform/ProjectCard";
import { FadeIn } from "@/components/motion/FadeIn";
import { projects } from "@/data/projects";

export default function ProjectsPage() {
  return (
    <div>
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
        (Projects)
      </p>
      <h1 className="mt-3 display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">
        All Projects<span className="text-flare">.</span>
      </h1>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {projects.map((p, i) => (
          <FadeIn key={p.id} delay={i * 0.06}>
            <ProjectCard project={p} />
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
