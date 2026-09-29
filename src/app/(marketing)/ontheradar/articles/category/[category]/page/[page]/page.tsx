import Link from "next/link";
import { notFound } from "next/navigation";
import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { articleCategories, ARTICLES_PER_PAGE, categoryLabelFromSlug, categorySlug, pageCount, sortArticlesCurrentFirst } from "@/lib/article-taxonomy";

export const revalidate = 3600;
export const dynamicParams = false;

type Params = { category: string; page: string };

async function getArchive() {
  const { articles } = await readPublishedContent();
  const labels = [...new Set(articles.flatMap(articleCategories))].sort((a, b) => a.localeCompare(b));
  return { articles, labels };
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
