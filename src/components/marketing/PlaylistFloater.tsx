"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

const PLAYLIST_ID = "PLZ_5O41VO5Mk";
const POSITION_KEY = "radar-playlist-floater-position";
type Position = { x: number; y: number };

function initialPosition(): Position { if (typeof window === "undefined") return { x: 0, y: 0 }; try { const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "null") as Position | null; if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved; } catch { /* use viewport fallback */ } return { x: window.innerWidth - 76, y: window.innerHeight - 92 }; }

export function PlaylistFloater() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState<Position>(initialPosition);
  const send = (command: "playVideo" | "pauseVideo" | "unMute") => frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "https://www.youtube.com");
  const toggle = () => { if (playing) { send("pauseVideo"); setPlaying(false); } else { send("unMute"); send("playVideo"); setPlaying(true); } };
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - position.x, offsetY: event.clientY - position.y }; };
  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; const next = { x: Math.min(Math.max(8, event.clientX - drag.offsetX), window.innerWidth - 56), y: Math.min(Math.max(8, event.clientY - drag.offsetY), window.innerHeight - 56) }; setPosition(next); localStorage.setItem(POSITION_KEY, JSON.stringify(next)); };
  return <><iframe ref={frameRef} title="RADAR playlist audio" className="pointer-events-none fixed -left-px -top-px h-px w-px opacity-0" src={`https://www.youtube.com/embed/videoseries?list=${PLAYLIST_ID}&autoplay=1&mute=1&enablejsapi=1&controls=0&playsinline=1`} allow="autoplay" /><button type="button" aria-label={playing ? "Pause RADAR playlist" : "Play RADAR playlist"} title="Drag to move · click to play or pause" onClick={toggle} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }} className="fixed z-[60] flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-full border-2 border-paper bg-flare text-flare-foreground shadow-[3px_3px_0_0_var(--paper)] active:cursor-grabbing" style={{ left: position.x, top: position.y }}>{playing ? <Pause size={17} strokeWidth={2.5} /> : <Play size={17} strokeWidth={2.5} className="translate-x-px" />}</button></>;
}
