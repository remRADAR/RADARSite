import { IaIndex } from "@/components/marketing/IaPages";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { events } from "@/lib/ia-content";
export default function EventsPage() { return <><ArchiveStructuredData name="Events" description="Live rooms, listening sessions, and the next places to find the signal." path="/ontheradar/events" breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "Events", path: "/ontheradar/events" }]} /><IaIndex eyebrow="(On The Radar / Events)" title="Events" intro="Live rooms, listening sessions, and the next places to find the signal." items={events} basePath="/ontheradar/events" /></>; }
