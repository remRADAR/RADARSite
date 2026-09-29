import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { events, findBySlug } from "@/lib/ia-content";
export async function generateMetadata({ params }: { params: Promise<{ event: string }> }): Promise<Metadata> { const { event } = await params; const item = findBySlug(events, event); return item ? buildPageMetadata({ title: item.metaTitle || item.title, description: item.metaDescription || item.description, path: `/ontheradar/events/${item.slug}`, image: item.imageUrl || item.featuredImage }) : { title: "Event" }; }
export function generateStaticParams() { return events.map((item) => ({ event: item.slug })); }
export default async function EventDetail({ params }: { params: Promise<{ event: string }> }) { const { event } = await params; const item = findBySlug(events, event); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/ontheradar/events" />; }
