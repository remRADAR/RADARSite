import Link from "next/link";
import type { ArticleSourceExcerpt } from "@/lib/source-excerpt";

export function ArticleSourceExcerpt({ excerpt }: { excerpt: ArticleSourceExcerpt }) {
  const entity = excerpt.artistName || excerpt.songName || excerpt.releaseName;
  return <aside className="mt-12 border-2 border-current p-5" aria-label="RADAR source excerpt">
    <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">{excerpt.attribution}</p>
    <blockquote className="mt-4 max-w-2xl font-display text-2xl font-extrabold uppercase leading-[.95]">“{excerpt.excerpt}”</blockquote>
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest">
      {entity ? <span>{entity}</span> : null}
      {excerpt.sourceAuthor ? <span>By {excerpt.sourceAuthor}</span> : null}
      <Link href={excerpt.sourceArticleUrl} className="text-flare underline underline-offset-4">Read the full article →</Link>
    </div>
  </aside>;
}
