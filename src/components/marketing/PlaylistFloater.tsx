"use client";

import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getSiteOverridesServerSnapshot,
  getSiteOverridesSnapshot,
  parseSiteOverrides,
  subscribeToSiteOverrides,
} from "@/lib/site-overrides";

const POSITION_KEY = "radar-playlist-floater-position-v2";
const PLAYING_KEY = "radar-playlist-playing";
const COLLAPSED_KEY = "radar-playlist-collapsed";
type Position = { x: number; y: number };
type DragState = { pointerId: number; offsetX: number; offsetY: number; startX: number; startY: number };

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

function readCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function PlaylistFloater() {
  const overrides = parseSiteOverrides(useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot));
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const [playing, setPlaying] = useState(readPlaying);
  const [position, setPosition] = useState(readPosition);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const hasStoredPosition = position.x !== 0 || position.y !== 0;
  const visiblePosition = hasStoredPosition ? position : defaultPosition();

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
    if (!playing) return;
    send("unMute");
    send("playVideo");
  }, [playing]);

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

  useEffect(() => {
    // The server cannot read viewport dimensions or browser storage. Rehydrate
    // those values on the client so the floater does not remain at (0, 0).
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      if (!active) return;
      setPosition(readPosition());
      setPlaying(readPlaying());
      setCollapsed(readCollapsed());
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const keepInViewport = () => {
      setPosition((current) => {
        const next = {
          x: Math.min(Math.max(8, current.x), Math.max(8, window.innerWidth - 56)),
          y: Math.min(Math.max(8, current.y), Math.max(8, window.innerHeight - 56)),
        };
        if (next.x === current.x && next.y === current.y) return current;
        try {
          localStorage.setItem(POSITION_KEY, JSON.stringify(next));
        } catch {
          // The position remains usable for this session.
        }
        return next;
      });
    };
    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, []);

  const toggle = () => {
    if (playing) {
      send("pauseVideo");
      setPlayingState(false);
    } else {
      send("unMute");
      send("playVideo");
      setPlayingState(true);
    }
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // Collapse remains functional for this session.
    }
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - visiblePosition.x,
      offsetY: event.clientY - visiblePosition.y,
      startX: event.clientX,
      startY: event.clientY,
    };
    didDragRef.current = false;
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4) {
      didDragRef.current = true;
    }
    const next = {
      x: Math.min(Math.max(8, event.clientX - drag.offsetX), Math.max(8, window.innerWidth - 56)),
      y: Math.min(Math.max(8, event.clientY - drag.offsetY), Math.max(8, window.innerHeight - 56)),
    };
    setPosition(next);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      // The position remains usable for this session.
    }
  };

  const finishDrag = () => {
    dragRef.current = null;
  };

  const handlePlayerClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (collapsed) {
      toggleCollapsed();
    } else {
      toggle();
    }
  };

  if (!overrides.playlistEnabled) return null;

  return (
    <>
      <iframe
        ref={frameRef}
        title="RADAR playlist audio"
        className="pointer-events-none fixed -left-px -top-px h-px w-px opacity-0"
        src={`https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(overrides.playlistId)}&autoplay=1&mute=1&enablejsapi=1&controls=0&playsinline=1&origin=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.origin)}`}
        allow="autoplay; encrypted-media"
        onLoad={resumeIfActive}
      />
      <div
        className={`group fixed z-[60] ${hasStoredPosition ? "" : "bottom-2 right-2"}`}
        style={hasStoredPosition ? { left: visiblePosition.x, top: visiblePosition.y } : undefined}
      >
        {collapsed ? (
          <button
            type="button"
            aria-label="Expand RADAR playlist player"
            title="Expand RADAR playlist player"
            onClick={handlePlayerClick}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper bg-flare text-flare-foreground shadow-[2px_2px_0_0_var(--paper)] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flare"
          >
            <Maximize2 size={14} strokeWidth={2.5} />
          </button>
        ) : (
          <div className="relative h-12 w-12">
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-ink/20 bg-paper px-2 py-1 font-sans text-[11px] font-normal leading-none text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {overrides.playlistLabel}
            </span>
            <button
              type="button"
              aria-label={playing ? `Pause RADAR playlist — ${overrides.playlistLabel}` : `Play RADAR playlist — ${overrides.playlistLabel}`}
              title={overrides.playlistLabel}
              onClick={handlePlayerClick}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              className="flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border-2 border-paper bg-flare text-flare-foreground shadow-[3px_3px_0_0_var(--paper)] active:cursor-grabbing"
            >
              {playing ? <Pause size={17} strokeWidth={2.5} /> : <Play size={17} strokeWidth={2.5} className="translate-x-px" />}
            </button>
            <button
              type="button"
              aria-label="Minimize RADAR playlist player"
              title="Minimize player"
              onClick={toggleCollapsed}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-paper bg-ink text-paper shadow-sm transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flare"
            >
              <Minimize2 size={10} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
