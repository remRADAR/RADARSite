"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Severity = "critical" | "warning" | "recommendation" | "info";
type Finding = {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  status: "open" | "resolved" | "wont-fix";
  autoFixable: boolean;
};
type Report = {
  url: string;
  path: string;
  contentType: string;
  auditedAt: string;
  auditVersion: string;
  status: string;
  liveFetch: boolean;
  scores: { overall: number; technical: number; metadata: number; structuredData: number; internalLinks: number; editorial: number };
  findings: Finding[];
  counts: Record<Severity, number>;
  notes: string[];
};
type RunRow = { id: string; path: string; auditedAt: string; scores: Report["scores"]; findings: Finding[] };

const SEVERITIES: Severity[] = ["critical", "warning", "recommendation", "info"];
const SEVERITY_COLOR: Record<Severity, string> = { critical: "text-red-400", warning: "text-amber-400", recommendation: "text-sky-400", info: "text-neutral-500" };
const CATEGORIES = ["technical", "metadata", "structured-data", "internal-links", "editorial", "music-entities", "sources"];
const PRESET_URLS = ["/", "/ontheradar/articles", "/radarmusic/artists", "/radarmusic/releases", "/ontheradar"];

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function SeoAuditPanel() {
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/seo-audit?limit=25", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.runs) setRuns(data.runs); if (data) setPersisted(Boolean(data.persisted)); })
      .catch(() => undefined);
  }, []);

  const visibleReports = useMemo(() => reports.map((report) => ({
    ...report,
    findings: report.findings.filter((finding) =>
      (severityFilter === "all" || finding.severity === severityFilter) &&
      (categoryFilter === "all" || finding.category === categoryFilter) &&
      (contentTypeFilter === "all" || report.contentType === contentTypeFilter)),
  })), [reports, severityFilter, categoryFilter, contentTypeFilter]);

  async function runAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/seo-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: urls.split("\n").map((line) => line.trim()).filter(Boolean) }),
      });
      const body = await response.json().catch(() => ({})) as { reports?: Report[]; persisted?: boolean; error?: string; errors?: { input: string; error: string }[] };
      if (!response.ok) {
        setError(body.errors?.map((item) => `${item.input}: ${item.error}`).join("; ") || body.error || "Audit failed");
        return;
      }
      setReports(body.reports || []);
      setPersisted(Boolean(body.persisted));
      const history = await fetch("/api/admin/seo-audit?limit=25", { cache: "no-store" }).then((res) => res.ok ? res.json() : null).catch(() => null);
      if (history?.runs) setRuns(history.runs);
    } catch {
      setError("Unable to reach the SEO audit API");
    } finally {
      setBusy(false);
    }
  }

  async function setFindingStatus(run: RunRow, finding: Finding, status: Finding["status"]) {
    const response = await fetch("/api/admin/seo-audit/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: run.id, findingId: finding.id, status }),
    }).catch(() => null);
    if (response?.ok) {
      setRuns((previous) => previous.map((row) => row.id === run.id ? { ...row, findings: row.findings.map((item) => item.id === finding.id ? { ...item, status } : item) } : row));
    }
  }

  return (
    <section className="border-t border-neutral-800 bg-neutral-950 text-neutral-100">
      <div className="px-5 py-6 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[.24em] text-neutral-500">RADAR / SEO Authority Auditor</p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-tighter">SEO audit scorecard.</h2>
        <p className="mt-2 font-mono text-xs leading-relaxed text-neutral-400">
          Audits are read-only. Scores measure conformance with this site&apos;s own SEO standards — they are not a Google ranking factor.
          {!persisted && " Audit history persistence requires DATABASE_URL; results in this panel are session-only until then."}
        </p>

        <form onSubmit={runAudit} className="mt-6 space-y-3">
          <label className="block font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            URLs to audit (one per line, max 10)
            <textarea
              value={urls}
              onChange={(event) => setUrls(event.target.value)}
              rows={3}
              spellCheck={false}
              placeholder={"/ontheradar/articles/example-slug\nhttps://radarcharts.net/radarmusic/artists/example"}
              className="mt-2 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-3 font-mono text-sm text-neutral-100 outline-none focus:border-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black disabled:opacity-50">
              {busy ? "Auditing…" : "Run audit"}
            </button>
            <button type="button" onClick={() => setUrls(PRESET_URLS.join("\n"))} className="rounded border border-neutral-700 px-4 py-3 font-mono text-xs uppercase tracking-widest text-neutral-300 hover:border-neutral-500">
              Fill sample routes
            </button>
          </div>
          {error && <p role="alert" className="font-mono text-xs uppercase text-red-400">{error}</p>}
        </form>

        {reports.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} aria-label="Filter by severity" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 font-mono text-xs text-neutral-200">
              <option value="all">All severities</option>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 font-mono text-xs text-neutral-200">
              <option value="all">All categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={contentTypeFilter} onChange={(event) => setContentTypeFilter(event.target.value)} aria-label="Filter by content type" className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 font-mono text-xs text-neutral-200">
              <option value="all">All content types</option>
              {[...new Set(reports.map((report) => report.contentType))].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        )}

        {visibleReports.map((report) => (
          <article key={report.path} className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <header className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-neutral-100">{report.path}</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  {report.contentType} · {report.status} · live fetch {report.liveFetch ? "yes" : "no"} · {report.auditedAt}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-black ${scoreColor(report.scores.overall)}`}>{report.scores.overall}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">overall score</p>
              </div>
            </header>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[["Technical", report.scores.technical], ["Metadata", report.scores.metadata], ["Structured data", report.scores.structuredData], ["Internal links", report.scores.internalLinks], ["Editorial", report.scores.editorial]].map(([label, value]) => (
                <div key={String(label)} className="rounded border border-neutral-800 bg-neutral-950 px-3 py-2">
                  <dt className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{label}</dt>
                  <dd className={`mt-1 font-mono text-lg font-bold ${scoreColor(Number(value))}`}>{value}</dd>
                </div>
              ))}
            </dl>
            {report.notes.length > 0 && (
              <ul className="mt-4 space-y-1">
                {report.notes.map((note) => <li key={note} className="font-mono text-[11px] text-neutral-500">— {note}</li>)}
              </ul>
            )}
            <ul className="mt-4 space-y-3">
              {report.findings.length === 0 && <li className="font-mono text-xs text-emerald-400">No findings for the current filters.</li>}
              {report.findings.map((finding) => (
                <li key={finding.id + finding.category} className="rounded border border-neutral-800 bg-neutral-950 p-3">
                  <p className="font-mono text-xs">
                    <span className={`uppercase font-bold ${SEVERITY_COLOR[finding.severity]}`}>{finding.severity}</span>
                    <span className="text-neutral-500"> · {finding.category} · </span>
                    <span className="text-neutral-200">{finding.title}</span>
                  </p>
                  <p className="mt-2 text-sm text-neutral-300">{finding.description}</p>
                  {finding.evidence && <p className="mt-2 font-mono text-[11px] break-all text-neutral-500">Evidence: {finding.evidence}</p>}
                  <p className="mt-2 font-mono text-[11px] text-sky-300">Fix: {finding.recommendation}</p>
                </li>
              ))}
            </ul>
            <a href={`/api/admin/seo-audit/export?path=${encodeURIComponent(report.path)}&format=csv`} className="mt-4 inline-block rounded border border-neutral-700 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-neutral-300 hover:border-neutral-500">
              Export latest stored report (CSV)
            </a>
          </article>
        ))}

        {runs.length > 0 && (
          <details className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-neutral-400">Audit history ({runs.length} recent runs)</summary>
            <ul className="mt-4 space-y-3">
              {runs.map((run) => (
                <li key={run.id} className="rounded border border-neutral-800 bg-neutral-950 p-3">
                  <p className="font-mono text-xs text-neutral-200">
                    {run.path} <span className="text-neutral-500">· {run.auditedAt} · score {run.scores?.overall ?? "n/a"}</span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {run.findings.map((finding) => (
                      <li key={finding.id} className="font-mono text-[11px] text-neutral-400">
                        <span className={`font-bold uppercase ${SEVERITY_COLOR[finding.severity]}`}>{finding.severity}</span> {finding.title}
                        {finding.status !== "open" && <span className="ml-2 rounded bg-neutral-800 px-2 py-0.5 text-[10px] uppercase text-neutral-300">{finding.status}</span>}
                        <span className="ml-2 flex gap-2">
                          <button type="button" onClick={() => setFindingStatus(run, finding, "resolved")} className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] uppercase text-neutral-300 hover:border-emerald-500">Mark resolved</button>
                          <button type="button" onClick={() => setFindingStatus(run, finding, "wont-fix")} className="rounded border border-neutral-700 px-2 py-0.5 text-[10px] uppercase text-neutral-300 hover:border-amber-500">Wont-fix</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}
