import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Projects",
  description: "The worlds, platforms, and creative systems built across the RADARCharts ecosystem.",
  path: "/ontheradar/projects",
});

type BrandProject = {
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  alt: string;
  href?: string;
  status: string;
};

const brandProjects: BrandProject[] = [
  {
    title: "THE MOTHERLand",
    eyebrow: "RADAR project / 01",
    description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.",
    image: "/motherland/featured.gif",
    alt: "Aerial view of a dense tropical forest surrounding a turquoise lake",
    href: "/motherland",
    status: "Live archive",
  },
  {
    title: "RADARMe",
    eyebrow: "RADAR project / 02",
    description: "The central hub for RADARCharts services, programs, and community operations.",
    image: "/projects/radarme-featured.png",
    alt: "RADARMe smiling headphone icon",
    status: "Coming Soon",
  },
];

function ProjectVisual({ project }: { project: BrandProject }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-ink bg-ink">
      <Image
        src={project.image}
        alt={project.alt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        unoptimized
        className="object-contain object-center transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
    </div>
  );
}

function ProjectCard({ project }: { project: BrandProject }) {
  const content = (
    <>
      <ProjectVisual project={project} />
      <div className="border-t-0 p-5 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{project.eyebrow}</p>
          <p className={`shrink-0 font-mono text-[11px] font-bold uppercase tracking-widest ${project.href ? "text-flare" : "text-muted-foreground"}`}>{project.status}</p>
        </div>
        <h2 className="mt-4 display max-w-[12ch] text-[clamp(2rem,4vw,4.5rem)] leading-[.9]">{project.title}</h2>
        <p className="mt-5 max-w-xl font-mono text-xs uppercase leading-relaxed tracking-wide text-muted-foreground">{project.description}</p>
        <span className={`mt-7 inline-flex font-mono text-xs font-bold uppercase tracking-widest ${project.href ? "text-flare" : "text-muted-foreground"}`}>
          {project.href ? "Open project →" : "Coming Soon"}
        </span>
      </div>
    </>
  );

  return project.href ? (
    <Link href={project.href} className="group/card block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flare">
      {content}
    </Link>
  ) : (
    <article className="group/card block" aria-label={`${project.title}, coming soon`}>
      {content}
    </article>
  );
}

export default function ProjectsPage() {
  return (
    <>
      <ArchiveStructuredData
        name="Projects"
        description="The worlds, platforms, and creative systems built across the RADARCharts ecosystem."
        path="/ontheradar/projects"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "Projects", path: "/ontheradar/projects" }]}
      />
      <main className="pt-14">
        <header className="flex flex-wrap items-end justify-between gap-8 px-4 pb-10 pt-16 md:px-8 md:pt-24">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(On The Radar / Projects)</p>
            <h1 className="mt-4 display max-w-[10ch] text-[clamp(3rem,11vw,11rem)] leading-[.9]">Projects<span className="text-flare">.</span></h1>
          </div>
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">The worlds, platforms, and creative systems built across the RADARCharts ecosystem.</p>
        </header>
        <section className="grid grid-cols-1 border-t-2 border-ink md:grid-cols-2" aria-label="RADAR brand projects">
          {brandProjects.map((project, index) => (
            <div key={project.title} className={`border-b-2 border-ink ${index % 2 === 0 ? "md:border-r-2 md:border-ink" : ""}`}>
              <ProjectCard project={project} />
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
