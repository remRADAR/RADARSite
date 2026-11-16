import { Flipbook } from "@/components/marketing/Flipbook";
import { buildMagazineIssue } from "@/lib/magazine-pages";
import { normalizeEditorialRecord } from "@/lib/editorial-normalization";
import type { CmsRecord } from "@/lib/content-server";

/**
 * Magazine article reading experience.
 *
 * The article is presented as a flipbook issue: the article's featured image is
 * the front cover, the body is packed into pages, and every inline image is
 * rendered inside the page it was packed into so it turns with that page.
 */
export function MagazineArticleView({ record, backPath = "/ontheradar/magazine" }: { record: CmsRecord; backPath?: string }) {
  const normalized = normalizeEditorialRecord(record);
  const issue = buildMagazineIssue(normalized);
  const title = String(normalized.title || "Magazine");
  const subtitle = String(normalized.excerpt || normalized.subtitle || "");

  return (
    <Flipbook
      pages={issue.pages}
      contents={issue.contents}
      title={title}
      subtitle={subtitle}
      issueLabel={issue.issueLabel}
      backPath={backPath}
      backLabel="Back to magazine"
      colophon={`${title} — ${issue.issueLabel}. RADARCharts by REM.`}
    />
  );
}
