import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";
export const revalidate = 3600;
export default async function MagazinePage() { const { magazine, articles } = await readPublishedContent(); const magazineArticles = articles.filter((article) => deriveEditorialTaxonomy(article).editorialType === "Magazine"); const merged = [...magazineArticles, ...magazine.filter((story) => !magazineArticles.some((article) => article.slug === story.slug))]; return <IaIndex eyebrow="(On The Radar / Magazine)" title="Magazine" intro="Special episodes and magazine episodes: long-form conversations and cultural stories with room to breathe." items={merged} basePath="/ontheradar/magazine" />; }
