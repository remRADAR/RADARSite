"use client";
import { FormEvent, ReactNode, useEffect, useState } from "react";

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/studio/session", { cache: "no-store" })
      .then((response) => setAuthenticated(response.ok))
      .catch(() => setAuthenticated(false));
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        setError(body.error || "Unable to authenticate");
        setPassword("");
        return;
      }
      setPassword("");
      setAuthenticated(true);
    } catch {
      setError("Unable to reach Studio authentication");
    } finally {
      setBusy(false);
    }
  }

  if (authenticated === null) return <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100"><p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Checking Studio access…</p></main>;
  if (!authenticated) return <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100"><form onSubmit={login} className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"><p className="font-mono text-[10px] uppercase tracking-[.24em] text-neutral-500">RADAR / Studio access</p><h1 className="mt-3 text-3xl font-black uppercase tracking-tighter">Admin password.</h1><p className="mt-3 font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-400">Enter the Studio admin password to initiate edits and access migration controls.</p><label className="mt-6 block font-mono text-[10px] uppercase tracking-widest text-neutral-500">Studio admin password<input autoFocus required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-3 text-sm text-neutral-100 outline-none focus:border-white" /></label>{error && <p role="alert" className="mt-3 font-mono text-xs uppercase text-red-400">{error}</p>}<button type="submit" disabled={busy} className="mt-5 w-full rounded bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black disabled:opacity-50">{busy ? "Authenticating…" : "Enter Studio"}</button></form></main>;
  return <>{children}</>;
}
