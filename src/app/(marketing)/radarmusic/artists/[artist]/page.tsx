import { notFound } from "next/navigation";
import { IaDetail } from "@/components/marketing/IaPages";
import { artists, findBySlug } from "@/lib/ia-content";
export function generateStaticParams() { return artists.map((item) => ({ artist: item.slug })); }
export default async function ArtistDetail({ params }: { params: Promise<{ artist: string }> }) { const { artist } = await params; const item = findBySlug(artists, artist); if (!item) notFound(); return <IaDetail item={item} kind="standard" backPath="/radarmusic/artists" />; }
