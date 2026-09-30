"use client";

import { useState } from "react";

export function ShareActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    ["X", `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`],
    ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`],
    ["Threads", `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`],
  ] as const;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* clipboard may be unavailable */ }
  }
  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) await navigator.share({ title, url }).catch(() => undefined);
    else await copy();
  }
  return <div className="mt-10 border-t-2 border-current pt-5" aria-label="Share this article"><p className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-60">Share this signal</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={nativeShare} className="border border-current px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest">Share / copy link</button>{links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="border border-current px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest">{label}</a>)}<button type="button" onClick={copy} className="border border-current px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest">{copied ? "Copied" : "Copy"}</button></div></div>;
}
