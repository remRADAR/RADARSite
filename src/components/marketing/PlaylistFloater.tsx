"use client";

import { AlertTriangle, LoaderCircle, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { radarAmbientEngine } from "@/lib/radar-ambient-engine";
import {
  getSiteOverridesServerSnapshot,
  getSiteOverridesSnapshot,
  parseSiteOverrides,
  subscribeToSiteOverrides,
} from "@/lib/site-overrides";

const POSITION_KEY = "radar-playlist-floater-position-v2";
type Position = { x: number; y: number };

function defaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return { x: Math.max(8, window.innerWidth - 76), y: Math.max(8, window.innerHeight - 92) };
}

function readPosition(): Position {
  const fallback = defaultPosition();
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null") as Position | null;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y) && !(saved.x < 100 && saved.y < 100)) {
      return {
        x: Math.min(Math.max(8, saved.x), Math.max(8, window.innerWidth - 56)),
        y: Math.min(Math.max(8, saved.y), Math.max(8, window.innerHeight - 56)),
      };
    }
  } catch {
    // Use the safe viewport fallback.
  }
  return fallback;
}

export function PlaylistFloater() {
  const overrides = parseSiteOverrides(useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot));
  const ambient = useSyncExternalStore(radarAmbientEngine.subscribe, radarAmbientEngine.getSnapshot, radarAmbientEngine.getServerSnapshot);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [position, setPosition] = useState<Position | null>(null);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [drag, setDrag] = useState<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const pointerMoved = useRef(false);
  const effectivePosition = position ?? (mounted ? readPosition() : { x: 0, y: 0 });

  if (!overrides.playlistEnabled) return null;

  const activateOrSilence = async () => {
    if (ambient.status === "ACTIVE") {
      radarAmbientEngine.deactivate();
      return;
    }
    await radarAmbientEngine.activate();
  };

  const handlePlayerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.detail > 0 && pointerMoved.current) {
      pointerMoved.current = false;
      return;
    }
    pointerMoved.current = false;
    void activateOrSilence();
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    pointerMoved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ pointerId: event.pointerId, offsetX: event.clientX - effectivePosition.x, offsetY: event.clientY - effectivePosition.y });
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const origin = pointerOrigin.current;
    if (!origin) return;
    if (!pointerMoved.current && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 6) return;
    pointerMoved.current = true;
    const next = {
      x: Math.min(Math.max(8, event.clientX - drag.offsetX), Math.max(8, window.innerWidth - 56)),
      y: Math.min(Math.max(8, event.clientY - drag.offsetY), Math.max(8, window.innerHeight - 56)),
    };
    setPosition(next);
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(next)); } catch { /* Position remains usable for this session. */ }
  };

  const statusLabel = ambient.status === "ACTIVE"
    ? ambient.foregroundMuted ? "Ambient muted for foreground media" : "Ambient active"
    : ambient.status === "ACTIVATING" ? "Activating RADAR audio"
      : ambient.status === "ERROR" ? "Audio unavailable"
        : "Audio off";
  const buttonLabel = ambient.status === "ACTIVE"
    ? "Silence RADAR ambient sound"
    : ambient.status === "ACTIVATING"
      ? "Activating RADAR ambient sound"
      : ambient.status === "ERROR"
        ? "Retry RADAR ambient sound activation"
        : "Enter RADAR — activate ambient sound";
  const volumePercent = Math.round(ambient.volume * 100);

  return (
    <div className="group fixed z-[60]" style={{ left: effectivePosition.x, top: effectivePosition.y }}>
      <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-ink/20 bg-paper px-2 py-1 font-sans text-[11px] font-normal leading-none text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {statusLabel}
      </span>
      <span className="sr-only" aria-live="polite">RADAR ambient sound: {statusLabel}{ambient.error ? ` — ${ambient.error}` : ""}</span>
      {volumeOpen && ambient.status === "ACTIVE" && (
        <label className="absolute bottom-full right-0 mb-3 flex w-44 items-center gap-2 border-2 border-ink bg-paper p-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
          {volumePercent === 0 ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
          <span className="sr-only">RADAR ambient volume</span>
          <input
            type="range"
            min="0"
            max="55"
            step="5"
            value={volumePercent}
            aria-label="RADAR ambient volume"
            onChange={(event) => radarAmbientEngine.setVolume(Number(event.target.value) / 100)}
            className="w-full accent-[var(--flare)]"
          />
          <output>{volumePercent}%</output>
        </label>
      )}
      <div className="flex items-center gap-2">
        {ambient.status === "ACTIVE" && (
          <button
            type="button"
            aria-label="Adjust RADAR ambient volume"
            title={`Ambient volume ${volumePercent}%`}
            onClick={() => setVolumeOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-paper bg-ink text-paper shadow-[3px_3px_0_0_var(--paper)]"
          >
            {volumePercent === 0 ? <VolumeX size={15} strokeWidth={2.5} /> : <Volume2 size={15} strokeWidth={2.5} />}
          </button>
        )}
        <button
          type="button"
          aria-label={buttonLabel}
          title={buttonLabel}
          disabled={ambient.status === "ACTIVATING"}
          onClick={handlePlayerClick}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => { pointerOrigin.current = null; setDrag(null); }}
          onPointerCancel={() => { pointerOrigin.current = null; pointerMoved.current = false; setDrag(null); }}
          className="flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border-2 border-paper bg-flare text-flare-foreground shadow-[3px_3px_0_0_var(--paper)] transition-transform active:scale-95 active:cursor-grabbing"
        >
          {ambient.status === "ERROR" ? <AlertTriangle size={17} strokeWidth={2.5} /> : ambient.status === "ACTIVATING" ? <LoaderCircle size={17} strokeWidth={2.5} className="animate-spin motion-reduce:animate-none" /> : ambient.status === "ACTIVE" ? <Pause size={17} strokeWidth={2.5} /> : <Play size={17} strokeWidth={2.5} className="translate-x-px" />}
        </button>
      </div>
    </div>
  );
}
