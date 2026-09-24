import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
export const revalidate = 3600;
export default async function MagazinePage() { const { magazine } = await readPublishedContent(); return <IaIndex eyebrow="(On The Radar / Magazine)" title="Magazine" intro="Long-form interviews, conversations, and cultural stories with room to breathe." items={magazine} basePath="/ontheradar/magazine" />; }
