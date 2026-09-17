import { sanitizeEditorialHtml } from "@/lib/editorial-migration";

export function RichEditorialBody({ html, fallback }: { html?: string; fallback?: string }) {
  const safe = html ? sanitizeEditorialHtml(html) : "";
  if (!safe) return <p className="mt-6 max-w-3xl whitespace-pre-wrap font-display text-[clamp(1.25rem,2.4vw,2rem)] font-extrabold uppercase leading-[1.08]">{fallback || ""}</p>;
  return <div className="editorial-body mt-8 max-w-3xl" dangerouslySetInnerHTML={{ __html: safe }} />;
}
