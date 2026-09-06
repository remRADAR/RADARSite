import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { events, findBySlug } from "@/lib/ia-content";
export function generateStaticParams() { return events.map((item) => ({ event: item.slug })); }
export default async function EventDetail({ params }: { params: Promise<{ event: string }> }) { const { event } = await params; const item = findBySlug(events, event); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/ontheradar/events" />; }
