"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { editorialAuthorProfile } from "@/lib/editorial-authors";

type ArticleListItem = { id: string; sourceId?: string; slug: string; title: string; excerpt: string; status: string; editorialType: string; magazineSubtype: string; projectSection: string; needsTaxonomyReview?: boolean; featuredImage: string; date: string; tags: string[]; categories: string[]; sourceProvider: string };
type EditorArticle = ArticleListItem & Record<string, unknown>;
type LibraryResponse = { items: ArticleListItem[]; pagination: { page: number; pageSize: number; total: number; pageCount: number }; taxonomy: { editorialTypes: string[]; magazineSubtypes: string[]; projectSections: string[] } };
type MediaAsset = { id: string; title: string; originalFilename: string; storageKey: string; deliveryUrl: string; mimeType: string; fileSize: number; width?: number; height?: number; alt: string; caption: string; createdAt: string };
type MediaLibraryResponse = { items: MediaAsset[]; pagination: { page: number; pageSize: number; total: number; pageCount: number }; maxUploadBytes?: number };

const input = "w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white";
const label = "font-mono text-[10px] uppercase tracking-[.16em] text-neutral-500";
const button = "border border-neutral-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40";

function formatBytes(size: number) { if (!Number.isFinite(size) || size <= 0) return "0 B"; const units = ["B", "KB", "MB", "GB"]; let value = size; let unit = 0; while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; } return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`; }
function escapeHtmlValue(value: string) { return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function inlineImageSnippet(url: string, alt: string, caption: string) { return `<figure><img src="${escapeHtmlValue(url)}" alt="${escapeHtmlValue(alt)}" loading="lazy" />${caption ? `<figcaption>${escapeHtmlValue(caption)}</figcaption>` : ""}</figure>`; }
type InlineFigure = { block: string; src: string; alt: string; caption: string };
function extractInlineFigures(bodyHtml: string): InlineFigure[] {
  const figures: InlineFigure[] = [];
  for (const match of bodyHtml.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)) {
    const block = match[0];
    const src = block.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    if (!src) continue;
    const alt = block.match(/<img\b[^>]*\balt\s*=\s*["']([^"']*)["']/i)?.[1]?.replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") || "";
    // Caption is plain text for the editor inputs: it is displayed through
    // React (auto-escaped) and written back through escapeHtmlValue, so it is
    // only entity-decoded here, never tag-stripped by hand.
    const caption = block.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]?.replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim() || "";
    figures.push({ block, src, alt, caption });
  }
  return figures;
}
/** Upload an image through the authenticated Studio media API with progress reporting. */
function uploadStudioMedia(file: File, meta: { title?: string; alt?: string; caption?: string }, onProgress?: (percent: number) => void): Promise<MediaAsset> {
  const form = new FormData();
  form.append("file", file);
  if (meta.title) form.append("title", meta.title);
  if (meta.alt) form.append("alt", meta.alt);
  if (meta.caption) form.append("caption", meta.caption);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/studio/media");
    request.upload.onprogress = (event) => { if (event.lengthComputable && onProgress) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100))); };
    request.onload = () => {
      try {
        const payload = JSON.parse(request.responseText || "{}") as { asset?: MediaAsset; error?: string };
        if (request.status >= 200 && request.status < 300 && payload.asset) { onProgress?.(100); resolve(payload.asset); }
        else reject(new Error(payload.error || `Upload failed (HTTP ${request.status})`));
      } catch { reject(new Error(`Upload failed (HTTP ${request.status})`)); }
    };
    request.onerror = () => reject(new Error("Upload failed. Check the connection and retry."));
    request.send(form);
  });
}

function emptyArticle(): EditorArticle { return { id: `local-${Date.now()}`, slug: "", title: "", excerpt: "", bodyHtml: "<p></p>", status: "draft", editorialType: "Press", magazineSubtype: "", projectSection: "", needsTaxonomyReview: false, featuredImage: "", featuredImageAlt: "", featuredImageCaption: "", date: new Date().toISOString().slice(0, 10), author: "Editorial Team, REM", tags: [], tagsApproved: [], tagsSuggested: [], categories: ["RADARArticles"], metaTitle: "", metaDescription: "", canonicalUrl: "", socialImage: "", noindex: false, focusTopic: "", sourceExcerpt: "", sourceExcerptSurface: "", sourceArtistName: "", sourceSongName: "", sourceReleaseName: "", sourceProvider: "radarsite" }; }
function Field({ name, children }: { name: string; children: React.ReactNode }) { return <label className="block"><span className={label}>{name}</span><span className="mt-2 block">{children}</span></label>; }

function RichToolbar({ area, onInsertImage, onOpenLibrary }: { area: React.RefObject<HTMLTextAreaElement | null>; onInsertImage?: () => void; onOpenLibrary?: () => void }) {
  const wrap = (before: string, after = before) => { const el = area.current; if (!el) return; const start = el.selectionStart; const end = el.selectionEnd; const selected = el.value.slice(start, end) || "text"; const next = `${el.value.slice(0, start)}${before}${selected}${after}${el.value.slice(end)}`; const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set; setter?.call(el, next); el.dispatchEvent(new Event("input", { bubbles: true })); el.focus(); };
  return <div className="flex flex-wrap gap-1 border border-b-0 border-neutral-800 bg-neutral-900 p-2">{[["H2", "<h2>", "</h2>"], ["H3", "<h3>", "</h3>"], ["Bold", "<strong>", "</strong>"], ["Italic", "<em>", "</em>"], ["Quote", "<blockquote>", "</blockquote>"], ["List", "<ul><li>", "</li></ul>"], ["Paragraph", "<p>", "</p>"]].map(([name, before, after]) => <button type="button" key={name} className={button} onClick={() => wrap(before, after)}>{name}</button>)}{onInsertImage && <button type="button" className={button} onClick={onInsertImage}>Image</button>}{onOpenLibrary && <button type="button" className={button} onClick={onOpenLibrary}>Library</button>}<span className="ml-auto self-center font-mono text-[9px] uppercase tracking-widest text-neutral-600">HTML / safe embeds only</span></div>;
}

function FeaturedImageAttachment({ article, update, onOpenLibrary }: { article: EditorArticle; update: (key: string, value: unknown) => void; onOpenLibrary: () => void }) {
  const [pending, setPending] = useState<{ file: File; previewUrl: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "confirm" | "uploading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const currentImage = String(article.featuredImage || "");

  const selectFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file (JPEG, PNG, WebP, GIF or AVIF)."); setStatus("error"); return; }
    setPending({ file, previewUrl: URL.createObjectURL(file) }); setStatus("confirm"); setError("");
  };
  const startUpload = async (file: File | null | undefined) => {
    if (!file) return;
    lastFileRef.current = file; setStatus("uploading"); setProgress(0); setError("");
    try {
      const asset = await uploadStudioMedia(file, { title: file.name, alt: String(article.featuredImageAlt || ""), caption: String(article.featuredImageCaption || "") }, setProgress);
      update("featuredImage", asset.deliveryUrl); update("featuredImageAssetId", asset.id);
      if (!String(article.featuredImageAlt || "") && asset.alt) update("featuredImageAlt", asset.alt);
      setPending((current) => { if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl); return null; });
      setStatus("idle");
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Upload failed"); setStatus("error"); }
  };
  const cancelPending = () => { setPending((current) => { if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl); return null; }); setStatus("idle"); setError(""); };
  const removeImage = () => { setPending((current) => { if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl); return null; }); update("featuredImage", ""); update("featuredImageAssetId", ""); setStatus("idle"); setError(""); };
  const copyUrl = async () => { try { await navigator.clipboard.writeText(currentImage); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable; the URL stays visible below */ } };

  return <div className="border border-neutral-800 bg-neutral-900">
    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; selectFile(file); }} />
    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files?.[0]); }} className={`p-4 ${dragOver ? "outline outline-1 outline-white" : ""}`}>
      {status === "uploading" && <div><p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">Uploading… {progress}%</p><div className="mt-2 h-1 w-full bg-neutral-800"><div className="h-1 bg-white transition-all" style={{ width: `${progress}%` }} /></div></div>}
      {status === "error" && <p role="alert" className="font-mono text-[10px] uppercase leading-relaxed text-red-400">{error}</p>}
      {status === "confirm" && pending && <><Image src={pending.previewUrl} alt="Selected image preview" width={1600} height={900} unoptimized className="aspect-[16/9] w-full object-cover" /><p className="mt-2 font-mono text-[10px] uppercase text-neutral-400">{pending.file.name} · {formatBytes(pending.file.size)} · not uploaded yet</p></>}
      {status === "idle" && currentImage && <Image src={currentImage} alt={String(article.featuredImageAlt || "")} width={1600} height={900} unoptimized className="aspect-[16/9] w-full object-cover" />}
      {status === "idle" && !currentImage && <div className="flex min-h-32 flex-col items-center justify-center gap-3 border border-dashed border-neutral-700 p-4 text-center"><p className="font-mono text-[10px] uppercase leading-relaxed text-neutral-500">Drop an image here, or attach from Photos / Files</p></div>}
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800 p-3">
      {status === "confirm" && <><button type="button" className="bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black" onClick={() => void startUpload(pending?.file)}>Upload image</button><button type="button" className={button} onClick={cancelPending}>Cancel</button></>}
      {status === "uploading" && <button type="button" className={button} disabled>Uploading…</button>}
      {status === "error" && <><button type="button" className={button} onClick={() => void startUpload(lastFileRef.current)}>Retry upload</button><button type="button" className={button} onClick={() => fileInputRef.current?.click()}>Choose another</button></>}
      {(status === "idle" || status === "confirm") && <button type="button" className={button} onClick={() => fileInputRef.current?.click()}>{currentImage ? "Replace image" : "Attach image"}</button>}
      {currentImage && status === "idle" && <><button type="button" className={button} onClick={onOpenLibrary}>Choose from library</button><button type="button" className={button} onClick={() => void copyUrl()}>{copied ? "URL copied" : "Copy URL"}</button><button type="button" className={button} onClick={removeImage}>Remove image</button></>}
    </div>
    {currentImage && status === "idle" && <p className="break-all border-t border-neutral-800 p-3 font-mono text-[9px] uppercase text-neutral-600">{currentImage}</p>}
  </div>;
}

function MediaLibraryDialog({ mode, onClose, onSelect }: { mode: "featured" | "social" | "inline"; onClose: () => void; onSelect: (asset: MediaAsset) => void }) {
  const [search, setSearch] = useState("");
  const [mime, setMime] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MediaLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heading = mode === "featured" ? "Choose the featured image" : mode === "social" ? "Choose the social image" : "Insert an inline image";

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const query = new URLSearchParams({ page: String(page), pageSize: "12", ...Object.fromEntries(Object.entries({ search, mime }).filter(([, value]) => value)) });
          const response = await fetch(`/api/studio/media?${query}`, { cache: "no-store", signal: controller.signal });
          if (!response.ok) throw new Error("Media library could not be loaded");
          setData(await response.json() as MediaLibraryResponse); setError("");
        } catch (loadError) { if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Media library could not be loaded"); }
        finally { if (!controller.signal.aborted) setLoading(false); }
      })();
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [search, mime, page]);

  const handleUpload = async (file: File | null | undefined) => {
    if (!file) return;
    setUploadStatus("uploading"); setUploadProgress(0); setUploadError("");
    try { const asset = await uploadStudioMedia(file, { title: file.name }, setUploadProgress); setUploadStatus("idle"); onSelect(asset); }
    catch (uploadError) { setUploadError(uploadError instanceof Error ? uploadError.message : "Upload failed"); setUploadStatus("error"); }
  };

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Media library">
    <div className="mx-auto max-w-3xl border border-neutral-700 bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 p-4"><div><p className={label}>Media library</p><h3 className="mt-1 text-xl font-black uppercase">{heading}</h3></div><button type="button" className={button} onClick={onClose}>Close</button></div>
      <div className="grid gap-2 border-b border-neutral-800 p-4 sm:grid-cols-[1fr_auto_auto]">
        <input className={input} placeholder="Search filename, title, alt…" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select className={input} value={mime} onChange={(e) => { setPage(1); setMime(e.target.value); }}><option value="">All types</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option><option value="image/gif">GIF</option><option value="image/avif">AVIF</option></select>
        <button type="button" className="bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black" onClick={() => fileInputRef.current?.click()}>Upload new</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void handleUpload(file); }} />
      <div className="p-4">
        {uploadStatus === "uploading" && <p aria-live="polite" className="font-mono text-[10px] uppercase text-neutral-400">Uploading… {uploadProgress}%</p>}
        {uploadStatus === "error" && <p role="alert" className="font-mono text-[10px] uppercase leading-relaxed text-red-400">{uploadError}</p>}
        {loading && <p className="py-8 text-center font-mono text-xs uppercase text-neutral-500">Loading…</p>}
        {!loading && error && <p role="alert" className="font-mono text-[10px] uppercase leading-relaxed text-red-400">{error}</p>}
        {!loading && !error && data?.items.length === 0 && <p className="py-8 text-center font-mono text-xs uppercase text-neutral-500">No media yet. Upload the first image.</p>}
        {!loading && !error && data && data.items.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{data.items.map((asset) => <figure key={asset.id} className="border border-neutral-800 bg-neutral-900 p-3"><Image src={asset.deliveryUrl} alt={asset.alt || asset.title} width={640} height={360} unoptimized className="aspect-[16/9] w-full object-cover" /><figcaption className="mt-2 space-y-1"><strong className="block truncate text-sm">{asset.title || asset.originalFilename}</strong><span className="block font-mono text-[9px] uppercase text-neutral-500">{asset.mimeType} · {formatBytes(asset.fileSize)}{asset.width ? ` · ${asset.width}×${asset.height}` : ""} · {asset.createdAt.slice(0, 10)}</span></figcaption><div className="mt-2 flex flex-wrap gap-1"><button type="button" className="bg-white px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-black" onClick={() => onSelect(asset)}>Use image</button><a href={asset.deliveryUrl} target="_blank" rel="noopener noreferrer" className={button}>Preview</a></div></figure>)}</div>}
      </div>
      {data && data.pagination.pageCount > 1 && <div className="flex items-center justify-between border-t border-neutral-800 p-4"><button type="button" className={button} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="font-mono text-[10px] uppercase text-neutral-500">Page {page} / {data.pagination.pageCount}</span><button type="button" className={button} disabled={page >= data.pagination.pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
    </div>
  </div>;
}

function Preview({ article }: { article: EditorArticle }) { const html = String(article.bodyHtml || "").replace(/<script[\s\S]*?<\/script>/gi, ""); return <div className="h-full min-h-[38rem] border border-neutral-800 bg-neutral-950"><div className="border-b border-neutral-800 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-neutral-500">Live article preview</div><div className="p-5"><p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{String(article.editorialType || "Press")} {article.projectSection ? `/ ${String(article.projectSection)}` : ""}</p><h2 className="mt-4 text-4xl font-black uppercase leading-[.9] tracking-tighter">{String(article.title || "Untitled article")}</h2><p className="mt-4 font-mono text-xs uppercase leading-relaxed text-neutral-400">{String(article.excerpt || "Add an excerpt to see the deck here.")}</p>{article.featuredImage && <Image src={String(article.featuredImage)} alt={String(article.featuredImageAlt || "")} width={1600} height={900} unoptimized className="mt-6 aspect-[16/9] w-full object-cover" />}{html && <iframe title="Article preview" sandbox="" srcDoc={`<!doctype html><html><head><style>body{background:#050505;color:#f7f7f2;font:16px/1.65 system-ui;padding:20px;margin:0}h2,h3{line-height:1.05;text-transform:uppercase}img{max-width:100%;height:auto}a{color:#fff}blockquote{border-left:3px solid #fff;padding-left:14px}</style></head><body>${html}</body></html>`} className="mt-6 min-h-[22rem] w-full border-t border-neutral-800" />}</div></div>; }

export function CmsStudioPanel() {
  const [library, setLibrary] = useState<LibraryResponse | null>(null);
  const [article, setArticle] = useState<EditorArticle | null>(null);
  const [filters, setFilters] = useState({ search: "", editorialType: "", projectSection: "", magazineSubtype: "", status: "" });
  const [page, setPage] = useState(1); const [sort, setSort] = useState("date"); const [manualTag, setManualTag] = useState(""); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("Loading the editorial library…");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const libraryAbortRef = useRef<AbortController | null>(null);
  const articleAbortRef = useRef<AbortController | null>(null);
  const loadLibrary = useCallback(async () => { libraryAbortRef.current?.abort(); const controller = new AbortController(); libraryAbortRef.current = controller; setLoading(true); const query = new URLSearchParams({ view: "library", page: String(page), pageSize: "12", sort, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) }); try { const response = await fetch(`/api/studio?${query}`, { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("Unable to load article library"); setLibrary(await response.json() as LibraryResponse); setMessage("Library ready"); } catch (error) { if (controller.signal.aborted) return; setMessage(error instanceof Error ? error.message : "Unable to load article library"); } finally { if (libraryAbortRef.current === controller) setLoading(false); } }, [filters, page, sort]);
  useEffect(() => { const timer = window.setTimeout(() => { void loadLibrary(); }, 0); return () => window.clearTimeout(timer); }, [loadLibrary]);
  const openArticle = async (id: string) => { articleAbortRef.current?.abort(); const controller = new AbortController(); articleAbortRef.current = controller; setMessage("Opening article…"); try { const response = await fetch(`/api/studio?view=article&id=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("Article could not be opened"); const payload = await response.json() as { article: EditorArticle }; if (!controller.signal.aborted) { setArticle(payload.article); setManualTag(""); setMessage("Editing a private draft"); } } catch (error) { if (controller.signal.aborted) return; setMessage(error instanceof Error ? error.message : "Article could not be opened"); } };
  const update = (key: string, value: unknown) => setArticle((current) => current ? { ...current, [key]: value } : current);
  const save = async (nextArticle: EditorArticle | null = article) => { if (!nextArticle) return; setSaving(true); setMessage("Saving draft…"); try { const response = await fetch("/api/studio", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ article: nextArticle }) }); const payload = await response.json() as { error?: string; article?: EditorArticle }; if (!response.ok) throw new Error(payload.error || "Save failed"); setArticle(payload.article || nextArticle); setMessage(nextArticle.status === "published" ? "Published to the shared CMS" : "Draft saved to the shared CMS"); await loadLibrary(); } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed"); } finally { setSaving(false); } };
  const taxonomy = library?.taxonomy || { editorialTypes: ["Press", "Spotlight", "Magazine"], magazineSubtypes: ["Special Episode", "Magazine Episode"], projectSections: ["Motherland"] };
  const suggestedTags = useMemo(() => Array.isArray(article?.tagsSuggested) ? article.tagsSuggested as string[] : [], [article]);
  const selectedTags = Array.isArray(article?.tags) ? article.tags as string[] : [];
  const addTag = (tag: string) => { if (!article) return; const tags = Array.isArray(article.tags) ? article.tags as string[] : []; update("tags", [...new Set([...tags, tag])]); };
  const setFilter = (key: keyof typeof filters, value: string) => { setPage(1); setFilters((current) => ({ ...current, [key]: value })); };
  const [libraryOpen, setLibraryOpen] = useState<null | "featured" | "social" | "inline">(null);
  const [inlineUpload, setInlineUpload] = useState<{ status: "idle" | "uploading" | "error" | "done"; progress: number; error: string; fileName: string }>({ status: "idle", progress: 0, error: "", fileName: "" });
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef(0);
  const lastInlineFileRef = useRef<File | null>(null);
  const captureBodyCursor = () => { const el = bodyRef.current; pendingCursorRef.current = el ? el.selectionStart ?? el.value.length : String(article?.bodyHtml || "").length; };
  /** Insert an HTML snippet at the saved cursor position without disturbing the surrounding article HTML. */
  const insertAtCursor = (snippet: string) => {
    const value = String(article?.bodyHtml || "");
    const position = Math.min(pendingCursorRef.current, value.length);
    update("bodyHtml", `${value.slice(0, position)}${snippet}${value.slice(position)}`);
    pendingCursorRef.current = position + snippet.length;
    requestAnimationFrame(() => { const node = bodyRef.current; if (!node) return; if (document.activeElement !== node) node.focus(); try { node.setSelectionRange(position + snippet.length, position + snippet.length); } catch { /* selection not supported in this state */ } });
  };
  const handleInlineFile = async (file: File | null | undefined) => {
    if (!file || !article) return;
    lastInlineFileRef.current = file; captureBodyCursor();
    setInlineUpload({ status: "uploading", progress: 0, error: "", fileName: file.name });
    try {
      const asset = await uploadStudioMedia(file, { title: file.name }, (percent) => setInlineUpload((current) => current ? { ...current, progress: percent } : current));
      insertAtCursor(inlineImageSnippet(asset.deliveryUrl, asset.alt || String(article.title || ""), ""));
      setInlineUpload({ status: "done", progress: 100, error: "", fileName: file.name });
      setMessage(`Inline image uploaded: ${file.name}`);
    } catch (error) { setInlineUpload({ status: "error", progress: 0, error: error instanceof Error ? error.message : "Upload failed", fileName: file.name }); }
  };
  const updateInlineFigure = (figure: InlineFigure, changes: { alt?: string; caption?: string }) => {
    if (!article) return;
    let nextBlock = figure.block;
    const nextAlt = changes.alt;
    if (nextAlt !== undefined) nextBlock = /<img\b[^>]*\balt\s*=/i.test(nextBlock) ? nextBlock.replace(/(<img\b[^>]*\balt\s*=\s*)(["'])([^"']*)\2/i, (_match, prefix: string, quote: string) => `${prefix}${quote}${escapeHtmlValue(nextAlt)}${quote}`) : nextBlock.replace(/<img\b/i, () => `<img alt="${escapeHtmlValue(nextAlt)}"`);
    const nextCaption = changes.caption;
    if (nextCaption !== undefined) {
      if (/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i.test(nextBlock)) nextBlock = nextCaption ? nextBlock.replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i, () => `<figcaption>${escapeHtmlValue(nextCaption)}</figcaption>`) : nextBlock.replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/i, "");
      else if (nextCaption) nextBlock = nextBlock.replace(/<\/figure>\s*$/i, () => `<figcaption>${escapeHtmlValue(nextCaption)}</figcaption></figure>`);
    }
    update("bodyHtml", String(article.bodyHtml).replace(figure.block, nextBlock));
  };
  const removeInlineFigure = (figure: InlineFigure) => {
    if (!article) return;
    update("bodyHtml", String(article.bodyHtml).replace(figure.block, ""));
    setMessage("Inline image removed from the article. The asset stays in the media library.");
  };
  const replaceInlineFile = async (figure: InlineFigure, file: File) => {
    if (!article) return;
    lastInlineFileRef.current = file;
    setInlineUpload({ status: "uploading", progress: 0, error: "", fileName: file.name });
    try {
      const asset = await uploadStudioMedia(file, { title: file.name }, (percent) => setInlineUpload((current) => current ? { ...current, progress: percent } : current));
      update("bodyHtml", String(article.bodyHtml).split(figure.src).join(asset.deliveryUrl));
      setInlineUpload({ status: "done", progress: 100, error: "", fileName: file.name });
      setMessage("Inline image replaced; the previous asset stays in the media library.");
    } catch (error) { setInlineUpload({ status: "error", progress: 0, error: error instanceof Error ? error.message : "Upload failed", fileName: file.name }); }
  };
  const selectLibraryAsset = (asset: MediaAsset) => {
    if (libraryOpen === "featured") { update("featuredImage", asset.deliveryUrl); update("featuredImageAssetId", asset.id); }
    else if (libraryOpen === "social") update("socialImage", asset.deliveryUrl);
    else insertAtCursor(inlineImageSnippet(asset.deliveryUrl, asset.alt || String(article?.title || ""), asset.caption || ""));
    setLibraryOpen(null);
    setMessage(`Media selected: ${asset.title || asset.originalFilename}`);
  };

  return <main className="min-h-screen bg-neutral-950 text-neutral-100"><header className="border-b border-neutral-800 px-5 py-6 sm:px-8"><div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-5"><div><p className="font-mono text-[10px] uppercase tracking-[.25em] text-neutral-500">RADAR / Studio / CMS</p><h1 className="mt-2 text-5xl font-black uppercase tracking-tighter sm:text-7xl">Editorial <span className="text-red-500">desk.</span></h1><p className="mt-4 max-w-2xl font-mono text-xs uppercase leading-relaxed tracking-wide text-neutral-400">A shared editorial workspace for articles, press, spotlights, and magazine episodes. Drafts stay private until a deliberate publish action.</p></div><div className="flex gap-2"><button type="button" className="bg-white px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black" onClick={() => { setArticle(emptyArticle()); setManualTag(""); setMessage("New draft ready"); }}>+ New article</button>{article && <button type="button" className={button} onClick={() => { setArticle(null); setManualTag(""); }}>Close editor</button>}</div></div></header><div className="mx-auto grid max-w-[1500px] lg:grid-cols-[minmax(22rem,30%)_1fr]"><aside className="border-r border-neutral-800 p-5 sm:p-8"><div className="flex items-center justify-between"><div><p className={label}>Archive</p><h2 className="mt-2 text-2xl font-black uppercase">Articles</h2></div><span className="font-mono text-[10px] uppercase text-neutral-500">{library?.pagination.total ?? "—"} records</span></div><div className="mt-6 space-y-2"><input className={input} placeholder="Search title, slug, tag…" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} /><div className="grid grid-cols-2 gap-2"><select className={input} value={filters.editorialType} onChange={(e) => setFilter("editorialType", e.target.value)}><option value="">All categories</option>{taxonomy.editorialTypes.map((item) => <option key={item}>{item}</option>)}</select><select className={input} value={filters.status} onChange={(e) => setFilter("status", e.target.value)}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div><div className="grid grid-cols-2 gap-2"><select className={input} value={filters.projectSection} onChange={(e) => setFilter("projectSection", e.target.value)}><option value="">All projects</option>{taxonomy.projectSections.map((item) => <option key={item}>{item}</option>)}</select><select className={input} value={filters.magazineSubtype} onChange={(e) => setFilter("magazineSubtype", e.target.value)}><option value="">All formats</option>{taxonomy.magazineSubtypes.map((item) => <option key={item}>{item}</option>)}</select></div><select className={input} value={sort} onChange={(e) => setSort(e.target.value)}><option value="date">Sort by date</option><option value="updated">Sort by updated</option><option value="title">Sort by title</option></select></div><p role="status" aria-live="polite" aria-atomic="true" className="mt-5 font-mono text-[10px] uppercase tracking-widest text-emerald-400">{message}</p><div className="mt-5 space-y-2">{loading && <p className="py-10 text-center font-mono text-xs uppercase text-neutral-500">Loading…</p>}{!loading && library?.items.map((item) => <button key={item.id} type="button" onClick={() => void openArticle(item.id)} className={`w-full border p-3 text-left transition ${article?.id === item.id ? "border-white bg-neutral-900" : "border-neutral-800 hover:border-neutral-500"}`}><div className="flex items-start justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">{item.editorialType || "Review"} {item.projectSection ? ` / ${item.projectSection}` : ""}</span><span className={`font-mono text-[9px] uppercase ${item.status === "published" ? "text-emerald-400" : "text-yellow-400"}`}>{item.status}</span></div><strong className="mt-2 block text-base leading-tight">{item.title}</strong><span className="mt-2 block truncate font-mono text-[10px] text-neutral-500">/{item.slug || "untitled"}</span>{item.needsTaxonomyReview && <span className="mt-2 block font-mono text-[9px] uppercase text-yellow-400">Taxonomy review required</span>}</button>)}</div>{library && <div className="mt-5 flex items-center justify-between border-t border-neutral-800 pt-4"><button type="button" className={button} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span className="font-mono text-[10px] uppercase text-neutral-500">Page {page} / {library.pagination.pageCount}</span><button type="button" className={button} disabled={page >= library.pagination.pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div>}</aside><section className="p-5 sm:p-8">{!article ? <div className="flex min-h-[42rem] items-center justify-center border border-dashed border-neutral-800 p-8 text-center"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-neutral-500">Select an entry</p><h2 className="mt-3 text-4xl font-black uppercase tracking-tighter">Write the next signal.</h2><p className="mx-auto mt-4 max-w-md font-mono text-xs uppercase leading-relaxed text-neutral-500">Choose an article from the server-paginated archive or start a new draft. The editor never loads the entire archive into the browser.</p></div></div> : <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,35%)]"><div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4"><div><p className={label}>Article editor</p><h2 className="mt-2 text-3xl font-black uppercase">{String(article.title || "Untitled draft")}</h2></div><div className="flex gap-2"><button type="button" className={button} disabled={saving} onClick={() => void save({ ...article, status: "draft" })}>Save as draft</button><button type="button" className="bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-black" disabled={saving} onClick={() => void save({ ...article, status: "published" })}>{saving ? "Saving…" : "Publish"}</button></div></div><div className="grid gap-4 md:grid-cols-2"><Field name="Title"><input className={input} value={String(article.title || "")} onChange={(e) => update("title", e.target.value)} /></Field><Field name="Slug"><input className={input} value={String(article.slug || "")} onChange={(e) => update("slug", e.target.value)} placeholder="generated-from-title" /></Field></div><Field name="Excerpt / deck"><textarea className={`${input} min-h-24`} value={String(article.excerpt || "")} onChange={(e) => update("excerpt", e.target.value)} /></Field><Field name="Body"><RichToolbar area={bodyRef} onInsertImage={() => { captureBodyCursor(); inlineFileRef.current?.click(); }} onOpenLibrary={() => { captureBodyCursor(); setLibraryOpen("inline"); }} /><div className="flex flex-wrap items-center gap-2 border border-b-0 border-neutral-800 bg-neutral-950 px-2 py-2"><input ref={inlineFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void handleInlineFile(file); }} />{inlineUpload.status === "uploading" && <span aria-live="polite" className="font-mono text-[9px] uppercase text-neutral-400">Uploading {inlineUpload.fileName}… {inlineUpload.progress}%</span>}{inlineUpload.status === "error" && <><span role="alert" className="font-mono text-[9px] uppercase text-red-400">{inlineUpload.error}</span><button type="button" className={button} onClick={() => void handleInlineFile(lastInlineFileRef.current)}>Retry</button></>}{inlineUpload.status === "done" && <span className="font-mono text-[9px] uppercase text-emerald-400">{inlineUpload.fileName} inserted</span>}</div><textarea ref={bodyRef} className={`${input} min-h-[26rem] resize-y border-t-0 font-mono text-xs leading-relaxed`} value={String(article.bodyHtml || "")} onChange={(e) => update("bodyHtml", e.target.value)} spellCheck={false} />{(() => { const figures = extractInlineFigures(String(article.bodyHtml || "")); if (!figures.length) return null; return <section className="border border-neutral-800 p-3"><p className={label}>Inline images ({figures.length})</p><div className="mt-3 space-y-4">{figures.map((figure, index) => <div key={`${figure.src}-${index}`} className="grid gap-3 border border-neutral-800 bg-neutral-900 p-3 sm:grid-cols-[10rem_1fr]"><Image src={figure.src} alt={figure.alt} width={320} height={180} unoptimized className="aspect-[16/9] w-full object-cover" /><div className="space-y-2"><input className={input} placeholder="Alt text" value={figure.alt} onChange={(e) => updateInlineFigure(figure, { alt: e.target.value })} /><input className={input} placeholder="Caption" value={figure.caption} onChange={(e) => updateInlineFigure(figure, { caption: e.target.value })} /><div className="flex flex-wrap gap-2"><label className={button}>Replace file<input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void replaceInlineFile(figure, file); }} /></label><button type="button" className={button} onClick={() => removeInlineFigure(figure)}>Remove from article</button></div></div></div>)}</div><p className="mt-3 font-mono text-[9px] uppercase leading-relaxed text-neutral-500">Removing an inline image only edits the article text. The asset stays in the media library for reuse.</p></section>; })()}</Field><div className="grid gap-4 md:grid-cols-2"><Field name="Author (automatic)"><input className={input} value={editorialAuthorProfile(article).byline} readOnly /></Field><Field name="Publish date"><input type="date" className={input} value={String(article.date || "").slice(0, 10)} onChange={(e) => update("date", e.target.value)} /></Field></div><section className="border-t border-neutral-800 pt-5"><p className={label}>Taxonomy</p><div className="mt-4 grid gap-4 md:grid-cols-3"><Field name="Editorial category"><select className={input} value={String(article.editorialType || "Press")} onChange={(e) => { update("editorialType", e.target.value); if (e.target.value !== "Magazine") update("magazineSubtype", ""); }}><option>Press</option><option>Spotlight</option><option>Magazine</option></select></Field><Field name="Magazine format"><select className={input} disabled={article.editorialType !== "Magazine"} value={String(article.magazineSubtype || "")} onChange={(e) => update("magazineSubtype", e.target.value)}><option value="">Choose format</option>{taxonomy.magazineSubtypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field name="Project / section"><select className={input} value={String(article.projectSection || "")} onChange={(e) => update("projectSection", e.target.value)}><option value="">None</option>{taxonomy.projectSections.map((item) => <option key={item}>{item}</option>)}</select></Field></div>{Boolean(article.taxonomyNeedsReview) && <p className="mt-3 border border-yellow-800 bg-yellow-950/30 p-3 font-mono text-[10px] uppercase leading-relaxed text-yellow-300">Legacy taxonomy inferred: {String(article.taxonomyEvidence || "editorial review required")}. Choose and save an explicit category.</p>}</section><section className="border-t border-neutral-800 pt-5"><p className={label}>Tags</p><div className="mt-3 flex flex-wrap gap-2">{(Array.isArray(article.tags) ? article.tags as string[] : []).map((tag) => <button key={tag} type="button" className="border border-white px-2 py-1 font-mono text-[10px] uppercase" onClick={() => update("tags", selectedTags.filter((item) => item !== tag))}>{tag} ×</button>)}</div><div className="mt-3 flex gap-2"><input className={input} placeholder="Add approved tag" value={manualTag} onChange={(e) => setManualTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const value = manualTag.trim(); if (value) { addTag(value); setManualTag(""); } } }} /><button type="button" className={button} onClick={() => { const value = manualTag.trim(); if (value) { addTag(value); setManualTag(""); } }}>Add tag</button></div><p className={`${label} mt-4`}>Suggested from article text and existing taxonomy</p><div className="mt-2 flex flex-wrap gap-2">{suggestedTags.filter((tag) => !selectedTags.includes(tag)).map((tag) => <button type="button" key={tag} className={button} onClick={() => addTag(tag)}>+ {tag}</button>)}</div></section><section className="border-t border-neutral-800 pt-5"><p className={label}>Featured media</p><div className="mt-4"><FeaturedImageAttachment article={article} update={update} onOpenLibrary={() => setLibraryOpen("featured")} /></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Field name="Alt text"><input className={input} value={String(article.featuredImageAlt || "")} onChange={(e) => update("featuredImageAlt", e.target.value)} /></Field></div><Field name="Caption"><input className={`${input} mt-4`} value={String(article.featuredImageCaption || "")} onChange={(e) => update("featuredImageCaption", e.target.value)} /></Field><p className="mt-3 font-mono text-[10px] uppercase leading-relaxed text-neutral-500">Images upload into Cloudflare storage and are tracked in the media library. Inline images and embeds belong in sanitized body HTML.</p></section><section className="border-t border-neutral-800 pt-5"><p className={label}>SEO & social</p><div className="mt-4 grid gap-4"><Field name="Meta title"><input className={input} value={String(article.metaTitle || "")} onChange={(e) => update("metaTitle", e.target.value)} /></Field><Field name="Meta description"><textarea className={`${input} min-h-20`} value={String(article.metaDescription || "")} onChange={(e) => update("metaDescription", e.target.value)} /></Field><Field name="Canonical URL"><input className={input} value={String(article.canonicalUrl || "")} onChange={(e) => update("canonicalUrl", e.target.value)} /></Field><Field name="Social image URL"><input className={input} value={String(article.socialImage || "")} onChange={(e) => update("socialImage", e.target.value)} /><button type="button" className={`${button} mt-2`} onClick={() => setLibraryOpen("social")}>Choose from media library</button></Field><Field name="Focus topic / entity"><input className={input} value={String(article.focusTopic || "")} onChange={(e) => update("focusTopic", e.target.value)} placeholder="Editorially verified topic or entity" /></Field><label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-neutral-400"><input type="checkbox" checked={Boolean(article.noindex)} onChange={(e) => update("noindex", e.target.checked)} /> Keep this record out of search indexes</label></div></section><section className="border-t border-neutral-800 pt-5"><p className={label}>RADAR source excerpt / music context</p><p className="mt-2 font-mono text-[10px] uppercase leading-relaxed text-neutral-500">Only use a short, editor-selected excerpt tied to a real artist, song, or release. The canonical article remains the source.</p><div className="mt-4 grid gap-4 md:grid-cols-2"><Field name="Selected excerpt"><textarea className={`${input} min-h-20`} maxLength={360} value={String(article.sourceExcerpt || "")} onChange={(e) => update("sourceExcerpt", e.target.value)} /></Field><Field name="Surface label"><input className={input} value={String(article.sourceExcerptSurface || "")} onChange={(e) => update("sourceExcerptSurface", e.target.value)} placeholder="Artist page, song page, search…" /></Field><Field name="Artist"><input className={input} value={String(article.sourceArtistName || "")} onChange={(e) => update("sourceArtistName", e.target.value)} /></Field><Field name="Song"><input className={input} value={String(article.sourceSongName || "")} onChange={(e) => update("sourceSongName", e.target.value)} /></Field><Field name="Release"><input className={input} value={String(article.sourceReleaseName || "")} onChange={(e) => update("sourceReleaseName", e.target.value)} /></Field></div></section><div className="sticky bottom-4 flex flex-wrap items-center gap-3 border border-neutral-700 bg-neutral-950 p-3"><button type="button" className="bg-white px-5 py-3 font-mono text-xs font-bold uppercase tracking-widest text-black" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save article"}</button><span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{message}</span></div></div><Preview article={article} /></div>}</section></div>{libraryOpen && <MediaLibraryDialog mode={libraryOpen} onClose={() => setLibraryOpen(null)} onSelect={selectLibraryAsset} />}</main>;
}
