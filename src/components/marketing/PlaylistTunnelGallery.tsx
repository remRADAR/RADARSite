"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { playlistGalleryItems } from "@/lib/playlist-gallery";
import styles from "./PlaylistTunnelGallery.module.css";

const wrapIndex = (index: number, total: number) => (index % total + total) % total;

function getDistance(index: number, activeIndex: number, total: number) {
  const forward = wrapIndex(index - activeIndex, total);
  const backward = wrapIndex(activeIndex - index, total);
  return forward <= backward ? forward : -backward;
}

export function PlaylistTunnelGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragRef = useRef({ active: false, startX: 0, lastX: 0 });
  const wheelRef = useRef(0);
  const lastWheelRef = useRef(0);
  const total = playlistGalleryItems.length;

  const moveBy = useCallback((amount: number) => {
    setActiveIndex((current) => wrapIndex(current + amount, total));
  }, [total]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") moveBy(-1);
      if (event.key === "ArrowRight") moveBy(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveBy]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 1) return;
    event.preventDefault();
    wheelRef.current += delta;
    const now = Date.now();
    if (Math.abs(wheelRef.current) > 45 && now - lastWheelRef.current > 260) {
      moveBy(wheelRef.current > 0 ? 1 : -1);
      wheelRef.current = 0;
      lastWheelRef.current = now;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, startX: event.clientX, lastX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.lastX = event.clientX;
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const distance = dragRef.current.lastX - dragRef.current.startX;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(distance) > 36) moveBy(distance < 0 ? 1 : -1);
  };

  const slides = useMemo(() => playlistGalleryItems.map((item, index) => ({
    ...item,
    distance: getDistance(index, activeIndex, total),
  })), [activeIndex, total]);

  return (
    <section className={styles.gallery} aria-labelledby="playlist-gallery-title">
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>RADARMusic / RADARPlaylists</p>
          <h1 id="playlist-gallery-title">RADARPlaylists</h1>
        </div>
      </div>
      <div
        className={styles.slider}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        role="region"
        aria-label="RADARMusic playlist cover slider"
      >
        <div className={styles.track}>
          {slides.map((item) => {
            const distance = item.distance;
            const visible = Math.abs(distance) <= 3;
            return (
              <a
                key={`${item.category}-${item.src}`}
                href="#"
                className={`${styles.slide} ${visible ? styles[`distance${distance}`] : styles.hidden}`}
                aria-label={`${item.label} link placeholder`}
                onClick={(event) => {
                  event.preventDefault();
                  if (distance !== 0) moveBy(distance);
                }}
              >
                <Image
                  src={item.src}
                  alt={item.label}
                  fill
                  sizes="(max-width: 700px) 62vw, 30vw"
                  priority={visible}
                  fetchPriority={distance === 0 ? "high" : visible ? "auto" : "low"}
                />
              </a>
            );
          })}
        </div>
        <button type="button" className={`${styles.control} ${styles.previous}`} onClick={() => moveBy(-1)} aria-label="Previous playlist">←</button>
        <button type="button" className={`${styles.control} ${styles.next}`} onClick={() => moveBy(1)} aria-label="Next playlist">→</button>
      </div>
      <div className={styles.meta} aria-live="polite">
        <span>{String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <span>{playlistGalleryItems[activeIndex]?.label}</span>
        <span>Link placeholder</span>
      </div>
    </section>
  );
}
