import { IaIndex } from "@/components/marketing/IaPages";
import { radarProjects } from "@/lib/ia-content";
export default function ProjectsPage() { return <IaIndex eyebrow="(On The Radar / Projects)" title="Projects" intro="Campaigns, worlds, and creative systems built for the ecosystem." items={radarProjects} basePath="/ontheradar/projects" />; }
