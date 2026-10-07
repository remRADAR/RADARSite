import { notFound } from "next/navigation";
import { IaIndex } from "@/components/marketing/IaPages";
import { ArchivePagination } from "@/components/marketing/ArchivePagination";
import { readPublishedContent } from "@/lib/content-server";
import { paginateRecords, parseArchivePage, recordsForEditorialType } from "@/lib/editorial-archives";

export const dynamic = "force-dynamic";

export default async function PressArchive({ params }: { params: Promise<{ page: string }> }) {
  const page = parseArchivePage((await params).page);
  const { articles } = await readPublishedContent();
  const paginated = paginateRecords(recordsForEditorialType(articles, "Press"), page);
  if (paginated.page !== page) notFound();
  return <><IaIndex eyebrow="(RADARArticles / Press)" title="Press" intro="The current-first Press archive: ordinary RADAR editorial and news content, newest published entries first." items={paginated.items} basePath="/ontheradar/articles" /><ArchivePagination basePath="/ontheradar/articles/press" page={paginated.page} pageCount={paginated.pageCount} /></>;
}
