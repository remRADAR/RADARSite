"use client";

import { useCallback, useEffect, useState } from "react";

type ArticleImage = { id: string; title: string; hasFeaturedImageUpload: boolean; hasPageCover: boolean };
type ListResponse = { pages: ArticleImage[]; storageReady: boolean; error?: string };
type UploadResponse = { ok?: boolean; error?: string; title?: string; width?: number; height?: number; size?: number };
const panelButton = "border border-neutral-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40";
const inputStyle = "block w-full text-sm text-neutral-300 file:mr-3 file:border-0 file:bg-neutral-200 file:px-3 file:py-2 file:font-mono file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:text-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function NotionImageUploadPanel() {
  const [pages, setPages] = useState<ArticleImage[]>([]);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("Loading the configured Notion articles…");

  const refresh = useCallback(async (announce = true) => {
    setLoading(true);
    try {
      const response = await fetch("/api/studio/notion-images", { cache: "no-store" });
      const payload = await response.json() as ListResponse;
      if (!response.ok) throw new Error(payload.error || "Could not load Notion articles.");
      setPages(payload.pages);
      setStorageReady(payload.storageReady);
      if (announce) setMessage(`${payload.pages.length} configured Notion articles loaded.`);
    } catch (error) {
      if (announce) setMessage(error instanceof Error ? error.message : "Could not load Notion articles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function upload(page: ArticleImage) {
    const file = files[page.id];
    if (!file) { setMessage("Choose an image file first."); return; }
    const replaces = page.hasFeaturedImageUpload;
    if (replaces && !window.confirm(`Replace the current Featured Image Upload for “${page.title}”? The new image will be converted to WebP, stored in R2 and written to this Notion article. The article will not be published or have its status changed.`)) return;
    const form = new FormData();
    form.set("pageId", page.id);
    form.set("file", file);
    if (replaces) form.set("confirmReplacement", "true");
    setBusyId(page.id);
    setMessage(`Uploading image for ${page.title}…`);
    try {
      const response = await fetch("/api/studio/notion-images", { method: "POST", body: form });
      const payload = await response.json() as UploadResponse;
      if (!response.ok) throw new Error(payload.error || "Image upload failed.");
      setFiles((current) => { const next = { ...current }; delete next[page.id]; return next; });
      setPages((current) => current.map((item) => item.id === page.id ? { ...item, hasFeaturedImageUpload: true } : item));
      const dimensions = payload.width && payload.height ? ` (${payload.width} × ${payload.height} WebP)` : "";
      await refresh(false);
      setMessage(`Image saved for ${payload.title || page.title}${dimensions}. Notion now points to the durable R2 image; article status was not changed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setBusyId("");
    }
  }

  return <section aria-labelledby="notion-image-upload-title" className="border-b border-neutral-800 bg-neutral-950 px-5 py-8 text-neutral-100 sm:px-8">
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.25em] text-neutral-500">RADAR / Studio / Notion media</p>
          <h2 id="notion-image-upload-title" className="mt-2 text-3xl font-black uppercase tracking-tighter sm:text-4xl">Featured image uploads.</h2>
          <p className="mt-3 max-w-3xl font-mono text-[10px] uppercase leading-relaxed tracking-wide text-neutral-400">Upload a replacement image for one of the six configured Notion articles. Files are validated, converted to WebP and stored in R2, then the Notion “Featured Image Upload” field is updated. The status below reports whether that Notion field is populated; it does not confirm the image currently renders on the site. This does not publish the article or change its editorial status.</p>
        </div>
        <button type="button" className={panelButton} disabled={loading || Boolean(busyId)} onClick={() => void refresh()}>Refresh article status</button>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-5 min-h-4 font-mono text-[10px] uppercase leading-relaxed tracking-wide text-emerald-300">{message}</p>
      {!loading && !storageReady && <p role="alert" className="mt-3 border border-amber-900 bg-amber-950/30 p-3 font-mono text-[10px] uppercase leading-relaxed text-amber-200">Image uploads are unavailable in this environment because durable public image storage is not configured.</p>}
      {pages.length > 0 && <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{pages.map((page) => {
        const file = files[page.id];
        const busy = busyId === page.id;
        return <article key={page.id} className="border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold leading-snug">{page.title}</h3>
            <span className={`shrink-0 border px-2 py-1 font-mono text-[9px] uppercase tracking-wider ${page.hasFeaturedImageUpload ? "border-emerald-900 text-emerald-300" : "border-amber-900 text-amber-300"}`}>{page.hasFeaturedImageUpload ? "Notion image set" : "No upload"}</span>
          </div>
          {page.hasPageCover && <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-neutral-500">Notion page cover also present</p>}
          <label className="mt-5 block">
            <span className="mb-2 block font-mono text-[9px] uppercase tracking-widest text-neutral-500">Choose image · JPEG, PNG, WebP, GIF or AVIF · max 4 MiB</span>
            <input aria-label={`Choose a featured image for ${page.title}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className={inputStyle} disabled={busy || !storageReady} onChange={(event) => setFiles((current) => ({ ...current, [page.id]: event.target.files?.[0] }))} />
          </label>
          {file && <p className="mt-2 truncate font-mono text-[9px] text-neutral-400">Selected: {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MiB</p>}
          <button type="button" className="mt-4 w-full bg-white px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500" disabled={!storageReady || !file || Boolean(busyId)} onClick={() => void upload(page)}>{busy ? "Uploading and updating Notion…" : page.hasFeaturedImageUpload ? "Upload & replace image" : "Upload featured image"}</button>
        </article>;
      })}</div>}
      {!loading && pages.length === 0 && <p className="mt-5 border border-dashed border-neutral-800 p-6 text-center font-mono text-[10px] uppercase tracking-widest text-neutral-500">No configured Notion articles were returned.</p>}
      <p className="mt-5 font-mono text-[9px] uppercase leading-relaxed tracking-wide text-neutral-600">Images are content-addressed and converted to WebP at up to 2400 px. Replacing an existing Notion image requires browser confirmation. The six-page allowlist is enforced server-side.</p>
    </div>
  </section>;
}
