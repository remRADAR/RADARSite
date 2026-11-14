"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { playlistGalleryItems } from "@/lib/playlist-gallery";
import styles from "./PlaylistTunnelGallery.module.css";

const TAU = Math.PI * 2;
const SPIRAL_TURNS = 2;
const DEPTH_RANGE = 58;
const CARD_COUNT = playlistGalleryItems.length;

function wrap(value: number) {
  return ((value % 1) + 1) % 1;
}

export function PlaylistTunnelGallery() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const dragRef = useRef({ active: false, lastY: 0 });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const next = currentRef.current + (targetRef.current - currentRef.current) * (reducedMotion ? 1 : 0.085);
      currentRef.current = next;
      setScrollPosition(next);
      if (Math.abs(targetRef.current - next) > 0.0005) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  const move = (amount: number) => {
    targetRef.current += amount;
    if (reducedMotion) {
      currentRef.current = targetRef.current;
      setScrollPosition(targetRef.current);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    move(event.deltaY * 0.0018);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    dragRef.current = { active: true, lastY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    move((dragRef.current.lastY - event.clientY) * 0.0035);
    dragRef.current.lastY = event.clientY;
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const cards = useMemo(
    () => playlistGalleryItems.map((item, index) => {
      const depth = wrap(index / CARD_COUNT + scrollPosition);
      const angle = index / CARD_COUNT * TAU + scrollPosition * TAU * SPIRAL_TURNS;
      const ring = 8 + depth * 58;
      const x = Math.cos(angle) * ring;
      const y = Math.sin(angle) * ring * 0.58;
      const z = (0.5 - depth) * DEPTH_RANGE;
      const scale = 0.58 + depth * 0.92;
      const opacity = depth < 0.06 ? depth / 0.06 : depth > 0.93 ? (1 - depth) / 0.07 : 1;
      return {
        ...item,
        style: {
          "--x": `${x}%`,
          "--y": `${y}%`,
          "--z": `${z}rem`,
          "--scale": scale,
          "--opacity": Math.max(0, Math.min(1, opacity)),
          "--rotate": `${angle * 180 / Math.PI + 90}deg`,
        } as React.CSSProperties,
      };
    }),
    [scrollPosition],
  );

  return (
    <section className={styles.gallery} aria-label="RADARMusic playlist covers">
      <div
        ref={viewportRef}
        className={styles.viewport}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={stopDragging}
        role="application"
        aria-label="Interactive playlist cover tunnel"
      >
        <div className={styles.cards}>
          {cards.map((item) => (
            <figure key={`${item.category}-${item.src}`} className={styles.card} style={item.style}>
              <Image src={item.src} alt="" fill sizes="(max-width: 700px) 34vw, 240px" priority={false} />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
