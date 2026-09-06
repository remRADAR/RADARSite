import { IaIndex } from "@/components/marketing/IaPages";
import { articles } from "@/lib/ia-content";
export default function ArticlesPage() { return <IaIndex eyebrow="(On The Radar / Articles)" title="Articles" intro="Shorter, higher-frequency signals: news, updates, announcements, and quick features." items={articles} basePath="/ontheradar/articles" />; }
