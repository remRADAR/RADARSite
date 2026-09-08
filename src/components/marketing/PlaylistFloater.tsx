"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";

const POSITION_KEY = "radar-playlist-floater-position-v2";
const PLAYING_KEY = "radar-playlist-playing";
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

function readPlaying() {
  if (typeof window === "undefined") return true;
  try {
    const saved = sessionStorage.getItem(PLAYING_KEY);
    return saved === null ? true : saved === "true";
  } catch {
    return true;
  }
}

export function PlaylistFloater() {
  const snapshot = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const overrides = parseSiteOverrides(snapshot);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [playing, setPlaying] = useState<boolean | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const effectivePlaying = playing ?? (mounted ? readPlaying() : true);
  const effectivePosition = position ?? (mounted ? readPosition() : { x: 0, y: 0 });
  const origin = mounted ? window.location.origin : "";

  const send = (command: "playVideo" | "pauseVideo" | "unMute") => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "https://www.youtube.com");
  };

  const setPlayingState = (next: boolean) => {
    setPlaying(next);
    try {
      sessionStorage.setItem(PLAYING_KEY, String(next));
    } catch {
      // Playback remains functional when storage is unavailable.
    }
  };

  const resumeIfActive = useCallback(() => {
    if (!effectivePlaying) return;
    send("unMute");
    send("playVideo");
  }, [effectivePlaying]);

  useEffect(() => {
    const handleVisibility = () => {
      // Do not pause when the tab is hidden or the phone screen is locked. If the
      // browser suspends the iframe, ask YouTube to resume when it is visible again.
      if (document.visibilityState === "visible") resumeIfActive();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", resumeIfActive);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", resumeIfActive);
    };
  }, [resumeIfActive]);

  const toggle = () => {
    if (effectivePlaying) {
      send("pauseVideo");
      setPlayingState(false);
    } else {
      send("unMute");
      send("playVideo");
      setPlayingState(true);
    }
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
    localStorage.setItem(POSITION_KEY, JSON.stringify(next));
  };

  return (
    <>
      <iframe
        ref={frameRef}
        title="RADAR playlist audio"
        className="pointer-events-none fixed -left-px -top-px h-px w-px opacity-0"
        src={`https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(overrides.playlistId)}&autoplay=1&mute=1&enablejsapi=1&controls=0&playsinline=1&origin=${encodeURIComponent(origin)}`}
        allow="autoplay; encrypted-media"
        onLoad={resumeIfActive}
      />
      <div className="group fixed z-[60]" style={{ left: effectivePosition.x, top: effectivePosition.y }}>
        <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-ink/20 bg-paper px-2 py-1 font-sans text-[11px] font-normal leading-none text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {overrides.playlistLabel}
        </span>
        <button
          type="button"
          aria-label={effectivePlaying ? `Pause RADAR playlist — ${overrides.playlistLabel}` : `Play RADAR playlist — ${overrides.playlistLabel}`}
          title={overrides.playlistLabel}
          onClick={toggle}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          className="flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border-2 border-paper bg-flare text-flare-foreground shadow-[3px_3px_0_0_var(--paper)] active:cursor-grabbing"
        >
          {effectivePlaying ? <Pause size={17} strokeWidth={2.5} /> : <Play size={17} strokeWidth={2.5} className="translate-x-px" />}
        </button>
      </div>
    </>
  );
}
