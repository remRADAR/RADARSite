import { IaIndex } from "@/components/marketing/IaPages";
import { events } from "@/lib/ia-content";
export default function EventsPage() { return <IaIndex eyebrow="(On The Radar / Events)" title="Events" intro="Live rooms, listening sessions, and the next places to find the signal." items={events} basePath="/ontheradar/events" />; }
