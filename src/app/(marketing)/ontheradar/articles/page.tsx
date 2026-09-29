import Link from "next/link";
import { readPublishedContent } from "@/lib/content-server";
import { articleCategories, categorySlug, isCurrentRadarchartsArticle, sortArticlesCurrentFirst } from "@/lib/article-taxonomy";

export const revalidate = 3600;

export default async function ArticlesPage() {
  const { articles } = await readPublishedContent();
  const ordered = sortArticlesCurrentFirst(articles);
  const categoryMap = new Map<string, { label: string; current: number; legacy: number }>();

  for (const article of ordered) {
    for (const label of articleCategories(article)) {
      const key = label.toLowerCase();
      const entry = categoryMap.get(key) || { label, current: 0, legacy: 0 };
      if (isCurrentRadarchartsArticle(article)) entry.current += 1;
      else entry.legacy += 1;
      categoryMap.set(key, entry);
    }
  }

  const categories = [...categoryMap.values()].sort((a, b) => b.current - a.current || b.legacy - a.legacy || a.label.localeCompare(b.label));

  return (
    <div className="pt-14">
      <section className="border-b-2 border-ink px-4 pb-12 pt-16 md:px-8 md:pt-24">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(On The Radar / RADARArticles)</p>
        <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[.84]">RADAR<span className="text-flare">Articles.</span></h1>
        <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
          Browse the editorial archive by category. Current RADARCharts stories are kept ahead of the legacy archive, and each category is paginated to keep the archive fast and focused.
        </p>
      </section>

      <section aria-labelledby="article-categories" className="border-b-2 border-ink">
        <div className="flex items-end justify-between gap-4 border-b-2 border-ink px-4 py-5 md:px-8">
          <h2 id="article-categories" className="display text-3xl md:text-5xl">Categories<span className="text-flare">.</span></h2>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{articles.length} total entries</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {categories.map((category, index) => (
            <Link
              key={category.label}
              href={`/ontheradar/articles/category/${categorySlug(category.label)}/page/1`}
              className={`group border-b-2 border-ink p-6 transition-colors hover:bg-flare md:p-10 ${index % 2 === 0 ? "md:border-r-2" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                {category.current > 0 ? <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-flare group-hover:text-ink">Current first</span> : null}
              </div>
              <h3 className="mt-20 display text-4xl md:text-6xl">{category.label}<span className="text-flare group-hover:text-ink">.</span></h3>
              <p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted-foreground group-hover:text-ink">
                {category.current} current / {category.legacy} legacy · Open category →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
