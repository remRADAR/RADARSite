import { IaIndex } from "@/components/marketing/IaPages";
import { readContent } from "@/lib/content-server";
export const dynamic = "force-dynamic";
export default async function ArticlesPage() { const { articles } = await readContent(); return <IaIndex eyebrow="(On The Radar / Articles)" title="Articles" intro="Shorter, higher-frequency signals: news, updates, announcements, and quick features." items={articles} basePath="/ontheradar/articles" />; }
