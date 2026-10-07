import { IaIndex } from "@/components/marketing/IaPages";
import { caseStudies } from "@/lib/case-studies";
import { readPublishedContent, type CmsRecord } from "@/lib/content-server";

const RELEASE_ARTICLE_SLUGS = [
  "telman-releases-if-not-god-a-bold-gospel-drill-anthem",
  "tulapro-doubles-down-on-his-lifestyle-with-badboy-ii",
  "gande-is-breaking-boundaries-with-insta-babe",
] as const;

export default async function ReleasesPage() {
  const { articles } = await readPublishedContent();
  const mamuzo = caseStudies.find((item) => item.slug === "mamuzo-dark-era-peak-release");
  const selectedArticles: CmsRecord[] = RELEASE_ARTICLE_SLUGS.flatMap((slug) => {
    const item = articles.find((article) => article.slug === slug);
    return item ? [{ ...(item as unknown as CmsRecord), path: `/ontheradar/articles/${slug}` }] : [];
  });
  const items: CmsRecord[] = [
    ...(mamuzo ? [{
      slug: mamuzo.slug,
      path: `/work/${mamuzo.slug}`,
      title: mamuzo.title,
      excerpt: mamuzo.oneLiner,
      body: mamuzo.brief,
      imageUrl: mamuzo.heroImageUrl,
      section: "radar-articles",
      editorialType: "Press" as const,
      date: mamuzo.year,
      author: "RADARCharts by REM",
      status: "published" as const,
    }] : []),
    ...selectedArticles,
  ];
  return <IaIndex eyebrow="(RADARMusic / Releases)" title="Releases" intro="Records, worlds, and the stories that start when the track begins." items={items} basePath="/radarmusic/releases" />;
}
