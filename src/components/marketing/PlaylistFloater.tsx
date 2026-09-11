"use client";

import { Pause, Play, LoaderCircle, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getSiteOverridesServerSnapshot,
  getSiteOverridesSnapshot,
  parseSiteOverrides,
  subscribeToSiteOverrides,
} from "@/lib/site-overrides";

const POSITION_KEY = "radar-playlist-floater-position-v2";
const PLAYING_KEY = "radar-playlist-playing";
type Position = { x: number; y: number };
type PlayerStatus = "IDLE" | "LOADING" | "PLAYING" | "PAUSED" | "TRANSITIONING" | "ERROR";

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

function readPlayingPreference() {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(PLAYING_KEY) !== "false";
  } catch {
    return true;
  }
}

function parseYouTubeMessage(data: unknown): { state?: number; error?: number } | null {
  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data) as { event?: string; info?: { playerState?: number }; infoDelivery?: { playerState?: number }; data?: number };
    const state = parsed.info?.playerState ?? parsed.infoDelivery?.playerState;
    if (parsed.event === "onStateChange" && typeof parsed.data === "number") return { state: parsed.data };
    if (parsed.event === "infoDelivery" && typeof state === "number") return { state };
    if (parsed.event === "onError" && typeof parsed.data === "number") return { error: parsed.data };
    return null;
  } catch {
    return null;
  }
}

export function PlaylistFloater() {
  const snapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(snapshot);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("IDLE");
  const [position, setPosition] = useState<Position | null>(null);
  const effectivePosition = position ?? (mounted ? readPosition() : { x: 0, y: 0 });
  const origin = mounted ? window.location.origin : "";
  const effectivePlaying = status === "PLAYING";
  const statusLabel = status === "LOADING" || status === "TRANSITIONING" ? "Loading" : status === "ERROR" ? "Unavailable" : effectivePlaying ? "Playing" : "Paused";

  const send = useCallback((command: "playVideo" | "pauseVideo" | "unMute") => {
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "https://www.youtube.com",
    );
  }, []);

  const persistPreference = useCallback((next: boolean) => {
    try {
      sessionStorage.setItem(PLAYING_KEY, String(next));
    } catch {
      // Playback remains functional when storage is unavailable.
    }
  }, []);

  const resumeIfPreferred = useCallback(() => {
    if (!readPlayingPreference()) {
      send("pauseVideo");
      return;
    }
    setStatus("LOADING");
    send("unMute");
    send("playVideo");
  }, [send]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com" || event.source !== frameRef.current?.contentWindow) return;
      const message = parseYouTubeMessage(event.data);
      if (!message) return;
      if (message.error !== undefined) {
        setStatus("ERROR");
        return;
      }
      switch (message.state) {
        case 1:
          setStatus("PLAYING");
          break;
        case 2:
        case 5:
          setStatus("PAUSED");
          break;
        case 3:
          setStatus("TRANSITIONING");
          break;
        case 0:
        case -1:
          setStatus("IDLE");
          break;
        default:
          break;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && readPlayingPreference()) resumeIfPreferred();
    };
    window.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", resumeIfPreferred);
    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", resumeIfPreferred);
    };
  }, [resumeIfPreferred]);

  const toggle = () => {
    if (effectivePlaying) {
      setStatus("TRANSITIONING");
      persistPreference(false);
      send("pauseVideo");
      return;
    }
    setStatus("LOADING");
    persistPreference(true);
    send("unMute");
    send("playVideo");
  };

  if (!overrides.playlistEnabled) return null;

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - effectivePosition.x, offsetY: event.clientY - effectivePosition.y };
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = {
      x: Math.min(Math.max(8, event.clientX - drag.offsetX), Math.max(8, window.innerWidth - 56)),
      y: Math.min(Math.max(8, event.clientY - drag.offsetY), Math.max(8, window.innerHeight - 56)),
    };
    setPosition(next);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      // Position remains usable for this session.
    }
  };

  const buttonLabel = status === "ERROR"
    ? `Retry RADAR playlist — ${overrides.playlistLabel}`
    : effectivePlaying
      ? `Pause RADAR playlist — ${overrides.playlistLabel}`
      : `Play RADAR playlist — ${overrides.playlistLabel}`;

  return (
    <>
      <iframe
        ref={frameRef}
        title="RADAR playlist audio"
        className="pointer-events-none fixed -left-px -top-px h-px w-px opacity-0"
        src={`https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(overrides.playlistId)}&autoplay=1&mute=1&enablejsapi=1&controls=0&playsinline=1&origin=${encodeURIComponent(origin)}`}
        allow="autoplay; encrypted-media"
        onLoad={resumeIfPreferred}
      />
      <div className="group fixed z-[60]" style={{ left: effectivePosition.x, top: effectivePosition.y }}>
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-ink/20 bg-paper px-2 py-1 font-sans text-[11px] font-normal leading-none text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {overrides.playlistLabel}
        </span>
        <span className="sr-only" aria-live="polite">RADAR playlist: {statusLabel}</span>
        <button
          type="button"
          aria-label={buttonLabel}
          title={`${overrides.playlistLabel} — ${statusLabel}`}
          onClick={toggle}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          className="flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border-2 border-paper bg-flare text-flare-foreground shadow-[3px_3px_0_0_var(--paper)] transition-transform active:scale-95 active:cursor-grabbing"
        >
          {status === "ERROR" ? <AlertTriangle size={17} strokeWidth={2.5} /> : status === "LOADING" || status === "TRANSITIONING" ? <LoaderCircle size={17} strokeWidth={2.5} className="animate-spin motion-reduce:animate-none" /> : effectivePlaying ? <Pause size={17} strokeWidth={2.5} /> : <Play size={17} strokeWidth={2.5} className="translate-x-px" />}
        </button>
      </div>
    </>
  );
}
