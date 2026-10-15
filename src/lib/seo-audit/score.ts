import type { AuditCategory, AuditFinding, AuditScores } from "./types";

/**
 * Scoring methodology (documented in docs/seo-auditor.md):
 *
 * - Every category starts at 100.
 * - Penalties: critical -25, warning -10, recommendation -3, info -0.
 * - A category score is floored at 0.
 * - Overall score is the weighted mean of the five scored categories:
 *   technical 30%, metadata 25%, structured data 15%,
 *   internal links 15%, editorial 15%.
 * - "music-entities" and "sources" findings are readiness indicators and
 *   intentionally do not reduce the overall score yet.
 * - Populated fields do not earn points on their own: validity, consistency
 *   and suitability are what the checks measure.
 */

export const SEVERITY_PENALTY: Record<AuditFinding["severity"], number> = {
  critical: 25,
  warning: 10,
  recommendation: 3,
  info: 0,
};

export const CATEGORY_WEIGHTS: { category: ScoredCategory; weight: number }[] = [
  { category: "technical", weight: 0.3 },
  { category: "metadata", weight: 0.25 },
  { category: "structured-data", weight: 0.15 },
  { category: "internal-links", weight: 0.15 },
  { category: "editorial", weight: 0.15 },
];

type ScoredCategory = Extract<AuditCategory, "technical" | "metadata" | "structured-data" | "internal-links" | "editorial">;

export function scoreCategory(findings: AuditFinding[], category: AuditCategory): number {
  const penalty = findings
    .filter((finding) => finding.category === category)
    .reduce((total, finding) => total + SEVERITY_PENALTY[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}

export function computeScores(findings: AuditFinding[]): AuditScores {
  const technical = scoreCategory(findings, "technical");
  const metadata = scoreCategory(findings, "metadata");
  const structuredData = scoreCategory(findings, "structured-data");
  const internalLinks = scoreCategory(findings, "internal-links");
  const editorial = scoreCategory(findings, "editorial");
  const overall = Math.round(CATEGORY_WEIGHTS.reduce((total, entry) => total + entry.weight * scoreCategory(findings, entry.category), 0));
  return { overall: clamp(overall), technical, metadata, structuredData, internalLinks, editorial };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
