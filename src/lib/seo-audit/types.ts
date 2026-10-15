import type { CmsRecord } from "@/lib/content-server";

export const AUDIT_VERSION = "1.0.0";

export type AuditSeverity = "critical" | "warning" | "recommendation" | "info";
export type AuditCategory =
  | "technical"
  | "metadata"
  | "structured-data"
  | "internal-links"
  | "editorial"
  | "music-entities"
  | "sources";
export type FindingStatus = "open" | "resolved" | "wont-fix";

export type AuditContentType =
  | "article"
  | "magazine"
  | "artist"
  | "release"
  | "event"
  | "project"
  | "route";

export type AuditFinding = {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  status: FindingStatus;
  /** True only when a safe, previewable automatic fix exists. */
  autoFixable: boolean;
};

export type AuditScores = {
  overall: number;
  technical: number;
  metadata: number;
  structuredData: number;
  internalLinks: number;
  editorial: number;
};

export type AuditReport = {
  url: string;
  path: string;
  contentType: AuditContentType;
  auditedAt: string;
  auditVersion: string;
  status: "completed" | "failed";
  liveFetch: boolean;
  scores: AuditScores;
  findings: AuditFinding[];
  counts: { critical: number; warning: number; recommendation: number; info: number };
  notes: string[];
};

export type SeverityCounts = AuditReport["counts"];

export const SEVERITY_ORDER: AuditSeverity[] = ["critical", "warning", "recommendation", "info"];

export const CATEGORY_LABELS: Record<AuditCategory, string> = {
  technical: "Technical SEO",
  metadata: "Metadata",
  "structured-data": "Structured data",
  "internal-links": "Internal links",
  editorial: "Editorial quality",
  "music-entities": "Music entities",
  sources: "Sources",
};

/**
 * A finding is a quality signal, not a ranking prediction. Scores measure
 * conformance with this project's own SEO standards and must never be
 * presented as a Google ranking factor.
 */
export function emptyCounts(): SeverityCounts {
  return { critical: 0, warning: 0, recommendation: 0, info: 0 };
}

export function countSeverities(findings: AuditFinding[]): SeverityCounts {
  const counts = emptyCounts();
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export type IndexedAuditRecord = {
  record: CmsRecord;
  contentType: AuditContentType;
  collection: "articles" | "magazine" | "artists" | "releases" | "radarProjects" | "events";
};
