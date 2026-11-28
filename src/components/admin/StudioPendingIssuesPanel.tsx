"use client";

import { useCallback, useEffect, useState } from "react";
import type { PendingIssue, PendingIssueSeverity } from "@/lib/studio-pending-issues";

type Payload = {
  checkedAt: string;
  releasesChecked: number;
  summary: { total: number; critical: number; warning: number; info: number };
  issues: PendingIssue[];
};

const button = "border border-neutral-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40";
const severityClass: Record<PendingIssueSeverity, string> = { critical: "border-red-800 bg-red-950/30 text-red-300", warning: "border-yellow-800 bg-yellow-950/30 text-yellow-300", info: "border-sky-800 bg-sky-950/30 text-sky-300" };

export function StudioPendingIssuesPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/pending-issues", { cache: "no-store" });
      const next = await response.json() as Payload & { error?: string };
      if (!response.ok) throw new Error(next.error || "Pending issue check failed");
      setPayload(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pending issue check failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void check(); }, 0); return () => window.clearTimeout(timer); }, [check]);

  return <section className="border-b border-neutral-800 bg-neutral-950 px-5 py-5 text-neutral-100 sm:px-8" aria-labelledby="studio-health-heading">
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[.25em] text-neutral-500">RADAR / Studio / Engine check</p><h2 id="studio-health-heading" className="mt-2 text-2xl font-black uppercase tracking-tight">Pending issues.</h2><p className="mt-2 max-w-3xl font-mono text-[10px] uppercase leading-relaxed tracking-wide text-neutral-500">Release sources are probed before this report is built. A past-date presave stays visible to visitors, but is reported here as a blocking promotion issue.</p></div>
        <button type="button" className={button} onClick={() => void check()} disabled={loading}>{loading ? "Checking…" : "Run check again"}</button>
      </div>
      {error && <p role="alert" className="mt-4 border border-red-800 bg-red-950/30 p-3 font-mono text-[10px] uppercase leading-relaxed text-red-300">{error}</p>}
      {payload && !error && <>
        <div className="mt-5 grid gap-2 sm:grid-cols-4"><div className="border border-neutral-800 p-3"><p className="font-mono text-[9px] uppercase text-neutral-500">Releases checked</p><strong className="mt-1 block text-2xl">{payload.releasesChecked}</strong></div><div className="border border-red-900 p-3"><p className="font-mono text-[9px] uppercase text-red-400">Critical</p><strong className="mt-1 block text-2xl text-red-300">{payload.summary.critical}</strong></div><div className="border border-yellow-900 p-3"><p className="font-mono text-[9px] uppercase text-yellow-400">Warnings</p><strong className="mt-1 block text-2xl text-yellow-300">{payload.summary.warning}</strong></div><div className="border border-neutral-800 p-3"><p className="font-mono text-[9px] uppercase text-neutral-500">Total pending</p><strong className="mt-1 block text-2xl">{payload.summary.total}</strong></div></div>
        {payload.issues.length === 0 ? <p className="mt-4 border border-emerald-800 bg-emerald-950/20 p-3 font-mono text-[10px] uppercase text-emerald-300">No pending issues found in the checked release records.</p> : <div className="mt-4 space-y-2">{payload.issues.map((issue, index) => <article key={`${issue.code}-${issue.entityId}-${index}`} className={`border p-3 ${severityClass[issue.severity]}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong className="font-mono text-[10px] uppercase tracking-widest">{issue.title}</strong><span className="font-mono text-[9px] uppercase">{issue.severity}</span></div><p className="mt-2 text-sm font-semibold">{issue.entityLabel}</p><p className="mt-1 font-mono text-[10px] uppercase leading-relaxed opacity-80">Evidence: {issue.evidence}</p><p className="mt-1 font-mono text-[10px] uppercase leading-relaxed">Next: {issue.suggestedAction}</p></article>)}</div>}
        <p className="mt-4 font-mono text-[9px] uppercase text-neutral-600">Last checked {new Date(payload.checkedAt).toLocaleString()}.</p>
      </>}
    </div>
  </section>;
}
