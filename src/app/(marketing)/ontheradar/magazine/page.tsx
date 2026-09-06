import { IaIndex } from "@/components/marketing/IaPages";
import { magazine } from "@/lib/ia-content";
export default function MagazinePage() { return <IaIndex eyebrow="(On The Radar / Magazine)" title="Magazine" intro="Long-form interviews, conversations, and cultural stories with room to breathe." items={magazine} basePath="/ontheradar/magazine" />; }
