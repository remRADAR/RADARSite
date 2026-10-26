import { notFound } from "next/navigation";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { IaIndex } from "@/components/marketing/IaPages";
import { ArchivePagination } from "@/components/marketing/ArchivePagination";
import { readPublishedContent } from "@/lib/content-server";
import { EDITORIAL_ARCHIVE_PAGE_SIZE, paginateRecords, parseArchivePage, recordsForEditorialType } from "@/lib/editorial-archives";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;
// Notion/CMS publishing can add archive pages after deployment; accept them
// dynamically and rely on the shared tagged content cache for freshness.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const page = parseArchivePage((await params).page);
  return buildPageMetadata({
    title: `Spotlight Archive — Page ${page}`,
    description: "Artist-led RADARCharts profiles and discovery stories, newest published entries first.",
    path: `/ontheradar/articles/spotlight/page/${page}`,
  });
}

export async function generateStaticParams() {
  const { articles } = await readPublishedContent();
  const total = recordsForEditorialType(articles, "Spotlight").length;
  return Array.from({ length: Math.max(1, Math.ceil(total / EDITORIAL_ARCHIVE_PAGE_SIZE)) }, (_, index) => ({ page: String(index + 1) }));
}

export default async function SpotlightArchive({ params }: { params: Promise<{ page: string }> }) {
  const page = parseArchivePage((await params).page);
  const { articles } = await readPublishedContent();
  const paginated = paginateRecords(recordsForEditorialType(articles, "Spotlight"), page);
  if (paginated.page !== page) notFound();
  return <><ArchiveStructuredData name={`Spotlight — Page ${paginated.page}`} description="Artist-led Spotlight profiles, including female-artiste Spotlights that also appear on the independent Motherland project surface." path={`/ontheradar/articles/spotlight/page/${paginated.page}`} breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "RADARArticles", path: "/ontheradar/articles" }, { name: "Spotlight", path: `/ontheradar/articles/spotlight/page/${paginated.page}` }]} /><IaIndex eyebrow="(RADARArticles / Spotlight)" title="Spotlight" intro="Artist-led Spotlight profiles, including female-artiste Spotlights that also appear on the independent Motherland project surface." items={paginated.items} basePath="/ontheradar/articles" /><ArchivePagination basePath="/ontheradar/articles/spotlight" page={paginated.page} pageCount={paginated.pageCount} /></>;
}
