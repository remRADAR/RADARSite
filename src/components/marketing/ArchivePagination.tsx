import Link from "next/link";

export function ArchivePagination({ basePath, page, pageCount }: { basePath: string; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Archive pagination" className="flex items-center justify-between border-t-2 border-ink px-5 py-6 font-mono text-xs font-bold uppercase tracking-widest md:px-8">
      {page > 1 ? <Link className="text-flare hover:underline" href={`${basePath}/page/${page - 1}`}>← Previous</Link> : <span className="text-muted-foreground/40">← Previous</span>}
      <span>Page {page} / {pageCount}</span>
      {page < pageCount ? <Link className="text-flare hover:underline" href={`${basePath}/page/${page + 1}`}>Next →</Link> : <span className="text-muted-foreground/40">Next →</span>}
    </nav>
  );
}
