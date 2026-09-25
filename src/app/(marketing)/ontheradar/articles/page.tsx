import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
export const revalidate = 3600;

function timestamp(article: { publishedAt?: string; date?: string }) {
  const value = article.publishedAt || article.date || "";
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCurrentImport(article: unknown) {
  const sourceUrl = article && typeof article === "object" && "sourceUrl" in article && typeof article.sourceUrl === "string" ? article.sourceUrl : "";
  return /(^|\.)radarcharts\.net$/i.test(new URL(sourceUrl || "https://invalid.local").hostname);
}

export default async function ArticlesPage() {
  const { articles } = await readPublishedContent();
  const orderedArticles = [...articles].sort((a, b) => {
    const currentGroup = Number(isCurrentImport(b)) - Number(isCurrentImport(a));
    return currentGroup || timestamp(b) - timestamp(a);
  });
  return <IaIndex eyebrow="(On The Radar / Articles)" title="Articles" intro="Shorter, higher-frequency signals: news, updates, announcements, and quick features." items={orderedArticles} basePath="/ontheradar/articles" />;
}
