"use client";

import { useCallback, useEffect, useState } from "react";

type Playlist = {
  id: string;
  spotifyPlaylistId: string;
  spotifyUrl: string;
  title: string;
  description?: string;
  artworkUrl?: string;
  ownerName?: string;
  tracks: Array<{ id: string; name: string }>;
  visible: boolean;
  sortOrder: number;
  featured: boolean;
  metadataFetchedAt?: string;
  metadataStatus: string;
  lastError?: string;
  lastAttemptAt?: string;
};

type Config = { playlists: Playlist[]; featuredPlaylistId?: string; updatedAt: string };

const inputClass = "w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-white";
const labelClass = "font-mono text-[10px] uppercase tracking-[.16em] text-neutral-500";
const buttonClass = "border border-neutral-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition hover:border-white disabled:cursor-not-allowed disabled:opacity-40";

const statusColor: Record<string, string> = { ready: "text-emerald-400", stale: "text-amber-400", pending: "text-neutral-400", error: "text-red-400" };

export function ChartsManagementStudio() {
  const [config, setConfig] = useState<Config | null>(null);
  const [etag, setEtag] = useState<string | null>(null);
  const [message, setMessage] = useState("Loading chart configuration…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/spotify/playlists?admin=1", { cache: "no-store" });
      const data = await response.json() as { config?: Config; etag?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load chart configuration");
      setConfig(data.config || null);
      setEtag(data.etag ?? null);
      setMessage((data.config?.playlists?.length ?? 0) > 0 ? "Chart configuration loaded from the playlist store." : "No playlists stored yet. Seed the three official playlists to begin.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chart configuration");
      setMessage("");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = useCallback(async () => {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/spotify/playlists", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config, expectedEtag: etag }),
      });
      const data = await response.json() as { success?: boolean; config?: Config; etag?: string; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Save failed");
      setConfig(data.config || config);
      setEtag(data.etag ?? null);
      setMessage("Chart configuration saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }, [config, etag]);

  const seedDefaults = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const publicResponse = await fetch("/api/spotify/playlists", { cache: "no-store" });
      const publicData = await publicResponse.json() as { config?: Config };
      if (!publicData.config?.playlists?.length) throw new Error("Starter configuration unavailable");
      const response = await fetch("/api/spotify/playlists", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: publicData.config, expectedEtag: etag }),
      });
      const data = await response.json() as { success?: boolean; config?: Config; etag?: string; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Seeding failed");
      setConfig(data.config || publicData.config);
      setEtag(data.etag ?? null);
      setMessage("The three official playlists are configured. Run a synchronisation to pull the Spotify tracks.");
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Seeding failed");
      setMessage("");
    } finally {
      setBusy(false);
    }
  }, [etag]);

  const sync = useCallback(async (spotifyPlaylistId?: string) => {
    setSyncing(spotifyPlaylistId || "all");
    setError("");
    try {
      const response = await fetch("/api/spotify/playlists/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(spotifyPlaylistId ? { spotifyPlaylistId } : {}),
      });
      const data = await response.json() as { success?: boolean; outcomes?: Array<{ playlistId: string; status: string; trackCount?: number; error?: string }>; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error || "Synchronisation failed");
      const summary = (data.outcomes || []).map((outcome) => `${outcome.playlistId}: ${outcome.status}${outcome.trackCount !== undefined ? ` (${outcome.trackCount} tracks)` : outcome.error ? ` — ${outcome.error}` : ""}`).join(" · ");
      setMessage(summary ? `Synchronisation finished — ${summary}` : "Synchronisation finished.");
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Synchronisation failed");
      setMessage("");
    } finally {
      setSyncing(null);
    }
  }, [load]);

  const update = (index: number, patch: Partial<Playlist>) => {
    setConfig((current) => (current ? { ...current, playlists: current.playlists.map((playlist, i) => (i === index ? { ...playlist, ...patch } : playlist)) } : current));
  };

  return (
    <section className="border-t border-neutral-800 bg-neutral-950 px-5 py-8 text-neutral-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.22em] text-neutral-500">RADARCharts / Charts management</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Official Spotify playlists</h2>
            <p className="mt-2 max-w-2xl text-sm text-neutral-400">Configure how the three official playlists appear on the charts dashboard. Tracks and their order always come from Spotify synchronisation — they are never entered or edited here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void sync()} disabled={busy || syncing !== null} className={buttonClass}>{syncing === "all" ? "Syncing…" : "Sync all playlists"}</button>
            <button type="button" onClick={() => void save()} disabled={busy || !config} className={buttonClass}>Save configuration</button>
            <a href="/radarmusic/charts" target="_blank" rel="noreferrer" className={buttonClass}>Open dashboard preview ↗</a>
          </div>
        </div>

        {message ? <p className="mt-4 text-sm font-semibold text-emerald-400">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-red-400">{error}</p> : null}

        {config && config.playlists.length === 0 ? (
          <div className="mt-6 border border-neutral-800 p-5">
            <p className="text-sm text-neutral-300">The playlist store is empty. Seed the three official RADARCharts playlists (TOP 10 RADAR, TOP 100 ABUJA, THE GREAT WALL ABUJA), then run a synchronisation.</p>
            <button type="button" onClick={() => void seedDefaults()} disabled={busy} className={`${buttonClass} mt-4`}>{busy ? "Seeding…" : "Seed the three official playlists"}</button>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4">
          {(config?.playlists || []).map((playlist, index) => (
            <div key={playlist.id} className="grid gap-4 border border-neutral-800 p-4 lg:grid-cols-[1fr_1fr]">
              <div className="grid content-start gap-3">
                <label className="block"><span className={labelClass}>Chart display name<input className={`${inputClass} mt-1`} value={playlist.title} onChange={(event) => update(index, { title: event.target.value })} /></span></label>
                <label className="block"><span className={labelClass}>Spotify playlist URL or ID<input className={`${inputClass} mt-1`} value={playlist.spotifyPlaylistId} onChange={(event) => update(index, { spotifyPlaylistId: event.target.value.trim() })} /></span></label>
                <label className="block"><span className={labelClass}>Chart description<textarea className={`${inputClass} mt-1 min-h-20`} value={playlist.description || ""} onChange={(event) => update(index, { description: event.target.value })} /></span></label>
                <label className="block"><span className={labelClass}>Playlist artwork URL (optional — falls back to Spotify artwork)<input className={`${inputClass} mt-1`} value={playlist.artworkUrl || ""} onChange={(event) => update(index, { artworkUrl: event.target.value })} /></span></label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={playlist.visible} onChange={(event) => update(index, { visible: event.target.checked })} /> Visible</label>
                  <label className="flex items-center gap-2 text-sm"><input type="radio" name="featured-chart" checked={Boolean(playlist.featured)} onChange={() => update(index, { featured: true })} /> Featured</label>
                  <label className="flex items-center gap-2 text-sm">Selector order<input type="number" min={0} className={`${inputClass} w-20`} value={playlist.sortOrder} onChange={(event) => update(index, { sortOrder: Number(event.target.value) || 0 })} /></label>
                </div>
              </div>
              <div className="grid content-start gap-2 border-neutral-800 text-sm lg:border-l lg:pl-4">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-neutral-500">Synchronisation</p>
                <p>Status: <span className={`font-mono text-xs font-bold uppercase ${statusColor[playlist.metadataStatus] || "text-neutral-400"}`}>{playlist.metadataStatus}</span></p>
                <p className="text-neutral-400">Last successful sync: {playlist.metadataFetchedAt ? new Date(playlist.metadataFetchedAt).toLocaleString() : "never"}</p>
                <p className="text-neutral-400">Last attempt: {playlist.lastAttemptAt ? new Date(playlist.lastAttemptAt).toLocaleString() : "never"}</p>
                <p className="text-neutral-400">Tracks from Spotify: {playlist.metadataStatus === "ready" ? playlist.tracks.length : "—"}</p>
                {playlist.lastError ? <p className="text-red-400">Last error: {playlist.lastError}</p> : null}
                <p className="break-all font-mono text-[10px] text-neutral-600">Playlist ID: {playlist.spotifyPlaylistId}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void sync(playlist.spotifyPlaylistId)} disabled={syncing !== null} className={buttonClass}>{syncing === playlist.spotifyPlaylistId ? "Syncing…" : "Sync now"}</button>
                  <a href={`/radarmusic/charts?chart=${encodeURIComponent(playlist.id)}`} target="_blank" rel="noreferrer" className={buttonClass}>Preview in dashboard ↗</a>
                  <a href={playlist.spotifyUrl} target="_blank" rel="noreferrer" className={buttonClass}>Open on Spotify ↗</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
