import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { artists, findBySlug } from "@/lib/ia-content";
export async function generateMetadata({ params }: { params: Promise<{ artist: string }> }): Promise<Metadata> { const { artist } = await params; const item = findBySlug(artists, artist); return item ? buildPageMetadata({ title: item.metaTitle || item.name, description: item.metaDescription || item.bio, path: `/radarmusic/artists/${item.slug}`, image: item.imageUrl || item.featuredImage }) : { title: "Artist" }; }
export function generateStaticParams() { return artists.map((item) => ({ artist: item.slug })); }
export default async function ArtistDetail({ params }: { params: Promise<{ artist: string }> }) { const { artist } = await params; const item = findBySlug(artists, artist); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/radarmusic/artists" />; }
