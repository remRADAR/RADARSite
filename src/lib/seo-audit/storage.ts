import { databaseSql } from "@/lib/database";
import type { AuditFinding, AuditReport, AuditCategory, AuditSeverity } from "./types";

/**
 * Persistent audit history. The single `seo_audit_runs` table is the smallest
 * safe migration: one row per audited URL, with scores and findings as JSONB.
 * Follows the project's ensureXTable() convention (CREATE TABLE IF NOT EXISTS,
 * applied lazily) used by studio_settings and studio_content.
 */

export type AuditRunRow = {
  id: string;
  url: string;
  path: string;
  contentType: string;
  auditedAt: string;
  auditVersion: string;
  status: string;
  liveFetch: boolean;
  scores: AuditReport["scores"];
  findings: AuditFinding[];
  notes: string[];
};

export function hasAuditDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureSeoAuditTable() {
  const sql = databaseSql();
  await sql`CREATE TABLE IF NOT EXISTS seo_audit_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    url text NOT NULL,
    path text NOT NULL,
    content_type text NOT NULL,
    audited_at timestamptz NOT NULL DEFAULT now(),
    audit_version text NOT NULL,
    status text NOT NULL,
    live_fetch boolean NOT NULL DEFAULT false,
    scores jsonb NOT NULL,
    findings jsonb NOT NULL,
    notes jsonb NOT NULL DEFAULT '[]'::jsonb
  )`;
  await sql`CREATE INDEX IF NOT EXISTS seo_audit_runs_path_idx ON seo_audit_runs (path, audited_at DESC)`;
}

export async function saveAuditRun(report: AuditReport): Promise<string | null> {
  if (!hasAuditDatabase()) return null;
  await ensureSeoAuditTable();
  const sql = databaseSql();
  const rows = await sql`INSERT INTO seo_audit_runs (url, path, content_type, audit_version, status, live_fetch, scores, findings, notes)
    VALUES (${report.url}, ${report.path}, ${report.contentType}, ${report.auditVersion}, ${report.status}, ${report.liveFetch}, ${JSON.stringify(report.scores)}::jsonb, ${JSON.stringify(report.findings)}::jsonb, ${JSON.stringify(report.notes)}::jsonb)
    RETURNING id` as { id: string }[];
  return rows[0]?.id || null;
}

export type ListAuditRunsFilter = { path?: string; severity?: AuditSeverity; category?: AuditCategory; limit?: number };

export async function listAuditRuns(filter: ListAuditRunsFilter = {}): Promise<AuditRunRow[]> {
  if (!hasAuditDatabase()) return [];
  await ensureSeoAuditTable();
  const sql = databaseSql();
  const limit = Math.max(1, Math.min(100, filter.limit || 25));
  const rows = await sql`SELECT id, url, path, content_type AS "contentType", audited_at AS "auditedAt", audit_version AS "auditVersion", status, live_fetch AS "liveFetch", scores, findings, notes
    FROM seo_audit_runs
    WHERE (${filter.path || null}::text IS NULL OR path = ${filter.path || null})
    ORDER BY audited_at DESC
    LIMIT ${limit}` as AuditRunRow[];
  const severity = filter.severity?.toLowerCase();
  const category = filter.category?.toLowerCase();
  if (!severity && !category) return rows;
  return rows.map((row) => ({ ...row, findings: row.findings.filter((finding) => (!severity || finding.severity === severity) && (!category || finding.category === category)) }));
}

export async function getLatestAuditRun(path: string): Promise<AuditRunRow | null> {
  if (!hasAuditDatabase()) return null;
  await ensureSeoAuditTable();
  const sql = databaseSql();
  const rows = await sql`SELECT id, url, path, content_type AS "contentType", audited_at AS "auditedAt", audit_version AS "auditVersion", status, live_fetch AS "liveFetch", scores, findings, notes
    FROM seo_audit_runs WHERE path = ${path} ORDER BY audited_at DESC LIMIT 1` as AuditRunRow[];
  return rows[0] || null;
}

export async function updateFindingStatus(runId: string, findingId: string, status: AuditFinding["status"]): Promise<boolean> {
  if (!hasAuditDatabase()) return false;
  await ensureSeoAuditTable();
  const sql = databaseSql();
  const rows = await sql`SELECT findings FROM seo_audit_runs WHERE id = ${runId} LIMIT 1` as { findings: AuditFinding[] }[];
  const findings = rows[0]?.findings;
  if (!findings) return false;
  let updated = false;
  const next = findings.map((finding) => {
    if (finding.id === findingId) { updated = true; return { ...finding, status }; }
    return finding;
  });
  if (!updated) return false;
  await sql`UPDATE seo_audit_runs SET findings = ${JSON.stringify(next)}::jsonb WHERE id = ${runId}`;
  return true;
}
