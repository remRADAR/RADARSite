import { notFound } from "next/navigation";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { IaIndex } from "@/components/marketing/IaPages";
import { ArchivePagination } from "@/components/marketing/ArchivePagination";
import { readPublishedContent } from "@/lib/content-server";
import { EDITORIAL_ARCHIVE_PAGE_SIZE, paginateRecords, parseArchivePage, recordsForEditorialType } from "@/lib/editorial-archives";

export const revalidate = 3600;
export const dynamicParams = false;

export async function generateStaticParams() {
  const { articles } = await readPublishedContent();
  const total = recordsForEditorialType(articles, "Press").length;
  return Array.from({ length: Math.max(1, Math.ceil(total / EDITORIAL_ARCHIVE_PAGE_SIZE)) }, (_, index) => ({ page: String(index + 1) }));
}

export default async function PressArchive({ params }: { params: Promise<{ page: string }> }) {
  const page = parseArchivePage((await params).page);
  const { articles } = await readPublishedContent();
  const paginated = paginateRecords(recordsForEditorialType(articles, "Press"), page);
  if (paginated.page !== page) notFound();
  return <><ArchiveStructuredData name={`Press — Page ${paginated.page}`} description="The current-first Press archive: ordinary RADAR editorial and news content, newest published entries first." path={`/ontheradar/articles/press/page/${paginated.page}`} breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "RADARArticles", path: "/ontheradar/articles" }, { name: "Press", path: `/ontheradar/articles/press/page/${paginated.page}` }]} /><IaIndex eyebrow="(RADARArticles / Press)" title="Press" intro="The current-first Press archive: ordinary RADAR editorial and news content, newest published entries first." items={paginated.items} basePath="/ontheradar/articles" /><ArchivePagination basePath="/ontheradar/articles/press" page={paginated.page} pageCount={paginated.pageCount} /></>;
}
