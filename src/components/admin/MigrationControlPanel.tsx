"use client";
import { useState } from "react";

type Report = { totalWordPressPosts?: number; imported?: number; updated?: number; skipped?: number; failed?: number; imagesMigrated?: number; imagesFailed?: number; embedsDetected?: number; embedsConverted?: number; dryRun?: boolean; error?: string };
export function MigrationControlPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(dryRun: boolean) {
    setBusy(true); setReport(null);
    const response = await fetch("/api/studio/migrate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dryRun, updateExisting: true }) });
    setReport(await response.json()); setBusy(false);
  }
  return <section className="border-t border-neutral-800 bg-neutral-950 p-5 text-neutral-100 sm:p-8"><div className="mx-auto max-w-5xl"><p className="font-mono text-[10px] uppercase tracking-[.24em] text-neutral-500">Studio / Migration control</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tighter">WordPress archive.</h2><p className="mt-3 max-w-2xl font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-400">Run a read-only reconciliation first. The importer preserves source IDs and URLs, updates matching records, and sanitizes rich content before storage.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => run(true)} className="rounded border border-neutral-700 px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50">{busy ? "Working…" : "Dry run / reconcile"}</button><button type="button" disabled={busy} onClick={() => run(false)} className="rounded bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black disabled:opacity-50">Import + update archive</button></div>{report && <pre className="mt-5 overflow-auto rounded border border-neutral-800 p-4 font-mono text-xs leading-relaxed text-emerald-300">{JSON.stringify(report, null, 2)}</pre>}</div></section>;
}
