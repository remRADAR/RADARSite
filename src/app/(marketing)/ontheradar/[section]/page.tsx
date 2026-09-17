import { notFound } from "next/navigation";
import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent, type CmsRecord } from "@/lib/content-server";
import { canonicalSection, SECTION_LABELS, type CanonicalSection } from "@/lib/editorial-normalization";

export const dynamic = "force-dynamic";

const routes: Record<string, CanonicalSection> = {
  discovery: "discovery-spot",
  "talk-to-us": "talk-to-us",
  motherland: "motherland-radar",
  charts: "charts",
  editorials: "editorials",
  curated: "curated",
  legacies: "legacies",
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: route } = await params;
  const section = routes[route] || canonicalSection(route);
  if (!section) notFound();
  const { articles } = await readPublishedContent();
  const items = articles.filter((item) => {
    const record = item as CmsRecord;
    return canonicalSection(record.section) === section || [...(record.categories || []), ...(record.tags || [])].some((value) => canonicalSection(value) === section);
  });
  return <IaIndex eyebrow={`(On The Radar / ${SECTION_LABELS[section]})`} title={SECTION_LABELS[section]} intro="A focused RADAR editorial section, reconciled from the existing CMS archive." items={items} basePath="/ontheradar/articles" />;
}
