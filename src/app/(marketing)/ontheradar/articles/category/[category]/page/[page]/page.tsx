import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { articleCategories, ARTICLES_PER_PAGE, categoryLabelFromSlug, categorySlug, pageCount, sortArticlesCurrentFirst } from "@/lib/article-taxonomy";
import { publicSiteUrl, readPublicSiteOverrides, safeSocialImageUrl } from "@/lib/public-site";

export const revalidate = 3600;
export const dynamicParams = false;

type Params = { category: string; page: string };

async function getArchive() {
  const { articles } = await readPublishedContent();
  const labels = [...new Set(articles.flatMap(articleCategories))].sort((a, b) => a.localeCompare(b));
  return { articles, labels };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category, page } = await params;
  const { labels } = await getArchive();
  const label = categoryLabelFromSlug(category, labels);
  const settings = await readPublicSiteOverrides();
  const canonical = `/ontheradar/articles/category/${categorySlug(label || category)}/page/${page}`;
  const title = label ? `${label} Articles` : "RADARArticles";
  const description = label ? `RADARArticles in the ${label} category.` : settings.socialDescription;
  const image = safeSocialImageUrl(settings.socialImage);
  return { title, description, alternates: { canonical }, openGraph: { type: "website", url: `${publicSiteUrl()}${canonical}`, siteName: settings.siteName, title, description, images: [{ url: image, width: 1200, height: 630, alt: title }] }, twitter: { card: "summary_large_image", site: settings.xHandle, title, description, images: [image] } };
}

export async function generateStaticParams() {
  const { articles, labels } = await getArchive();
  return labels.flatMap((label) => {
    const total = pageCount(articles.filter((article) => articleCategories(article).some((value) => value.toLowerCase() === label.toLowerCase())).length);
    return Array.from({ length: total }, (_, index) => ({ category: categorySlug(label), page: String(index + 1) }));
  });
}

export default async function ArticleCategoryPage({ params }: { params: Promise<Params> }) {
  const { category, page: pageParam } = await params;
  const { articles, labels } = await getArchive();
  const label = categoryLabelFromSlug(category, labels);
  const page = Number(pageParam);
  if (!label || !Number.isInteger(page) || page < 1) notFound();

  const filtered = sortArticlesCurrentFirst(articles.filter((article) => articleCategories(article).some((value) => value.toLowerCase() === label.toLowerCase())));
  const totalPages = pageCount(filtered.length);
  if (page > totalPages) notFound();
  const start = (page - 1) * ARTICLES_PER_PAGE;
  const items = filtered.slice(start, start + ARTICLES_PER_PAGE);
  const previous = page > 1 ? `/ontheradar/articles/category/${categorySlug(label)}/page/${page - 1}` : null;
  const next = page < totalPages ? `/ontheradar/articles/category/${categorySlug(label)}/page/${page + 1}` : null;

  return (
    <div>
      <ArchiveStructuredData name={`${label} Articles`} description={`RADARArticles in the ${label} category.`} path={`/ontheradar/articles/category/${categorySlug(label)}/page/${page}`} breadcrumbs={[{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "RADARArticles", path: "/ontheradar/articles" }, { name: label, path: `/ontheradar/articles/category/${categorySlug(label)}/page/${page}` }]} />
      <div className="flex flex-wrap items-center justify-between gap-5 border-b-2 border-ink px-4 pb-6 pt-24 md:px-8">
        <div>
          <Link href="/ontheradar/articles" className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-flare">← All categories</Link>
          <p className="mt-6 font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Category / {label}</p>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">Page {page} of {totalPages} · {filtered.length} entries</p>
      </div>
      <IaIndex eyebrow={`(RADARArticles / ${label})`} title={label} intro="Current RADARCharts entries appear first. Continue through the pages for the complete migrated archive." items={items} basePath="/ontheradar/articles" />
      <nav aria-label="Article category pagination" className="flex items-center justify-between border-t-2 border-ink px-4 py-6 md:px-8">
        {previous ? <Link href={previous} className="font-mono text-xs font-bold uppercase tracking-widest hover:text-flare">← Previous page</Link> : <span />}
        {next ? <Link href={next} className="font-mono text-xs font-bold uppercase tracking-widest hover:text-flare">Next page →</Link> : <span />}
      </nav>
    </div>
  );
}
