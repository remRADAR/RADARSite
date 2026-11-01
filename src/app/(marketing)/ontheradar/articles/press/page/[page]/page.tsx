import { notFound } from "next/navigation";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { IaIndex } from "@/components/marketing/IaPages";
import { ArchivePagination } from "@/components/marketing/ArchivePagination";
import { readPublishedContent } from "@/lib/content-server";
import { paginateRecords, parseArchivePage, recordsForEditorialType } from "@/lib/editorial-archives";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 3600;
// The archive is CMS-backed and must reflect newly published Notion/CMS
// records without requiring a site rebuild. readPublishedContent retains the
// shared content cache and the publish webhook invalidates that cache.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const page = parseArchivePage((await params).page);
  return buildPageMetadata({
    title: `Press Archive — Page ${page}`,
    description: "The current-first Press archive: ordinary RADAR editorial and news content, newest published entries first.",
    path: `/ontheradar/articles/press/page/${page}`,
  });
}

export default async function PressArchive({ params }: { params: Promise<{ page: string }> }) {
  const page = parseArchivePage((await params).page);
  const { articles } = await readPublishedContent();
  const paginated = paginateRecords(recordsForEditorialType(articles, "Press"), page);
  if (paginated.page !== page) notFound();
  return <><ArchiveStructuredData name={`Press — Page ${paginated.page}`} description="The current-first Press archive: ordinary RADAR editorial and news content, newest published entries first." path={`/ontheradar/articles/press/page/${paginated.page}`} breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "RADARArticles", path: "/ontheradar/articles" }, { name: "Press", path: `/ontheradar/articles/press/page/${paginated.page}` }]} /><IaIndex eyebrow="(RADARArticles / Press)" title="Press" intro="The current-first Press archive: ordinary RADAR editorial and news content, newest published entries first." items={paginated.items} basePath="/ontheradar/articles" /><ArchivePagination basePath="/ontheradar/articles/press" page={paginated.page} pageCount={paginated.pageCount} /></>;
}
