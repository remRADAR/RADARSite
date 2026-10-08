import { IaIndex } from "@/components/marketing/IaPages";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { radarProjects } from "@/lib/ia-content";
export default function ProjectsPage() { return <><ArchiveStructuredData name="Projects" description="Campaigns, worlds, and creative systems built for the ecosystem." path="/ontheradar/projects" breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "Projects", path: "/ontheradar/projects" }]} /><IaIndex eyebrow="(On The Radar / Projects)" title="Projects" intro="Campaigns, worlds, and creative systems built for the ecosystem." items={radarProjects} basePath="/ontheradar/projects" /></>; }
