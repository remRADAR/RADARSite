"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { cn } from "@/lib/utils";

gsap.registerPlugin(Draggable, InertiaPlugin);

type DragCarouselProps = {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
};

/**
 * Momentum drag carousel — GSAP Draggable + InertiaPlugin so the feel matches
 * the rest of the site's motion. Also supports trackpad horizontal / shift+wheel
 * scrolling (smoothed), while plain vertical wheel still scrolls the page.
 * Falls back to native horizontal scroll under reduced-motion / before init.
 */
export function DragCarousel({ children, className, trackClassName }: DragCarouselProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let instances: Draggable[] = [];
    const minX = () => Math.min(0, wrap.clientWidth - track.scrollWidth);

    const setup = () => {
      instances.forEach((d) => d.kill());
      instances = Draggable.create(track, {
        type: "x",
        inertia: true,
        bounds: { minX: minX(), maxX: 0 },
        edgeResistance: 0.6,
        dragResistance: 0.05,
        cursor: "grab",
        activeCursor: "grabbing",
        dragClickables: true,
      });
    };

    setup();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnhanced(true);

    // Trackpad horizontal / shift+wheel → smooth horizontal scroll. Plain
    // vertical wheel is left alone so the page keeps scrolling normally.
    const onWheel = (e: WheelEvent) => {
      const horizontal =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!horizontal) return;
      e.preventDefault();
      const current = Number(gsap.getProperty(track, "x")) || 0;
      const next = gsap.utils.clamp(minX(), 0, current - horizontal * 1.1);
      gsap.to(track, {
        x: next,
        duration: 0.5,
        ease: "power3.out",
        overwrite: true,
        onUpdate: () => instances[0]?.update(),
      });
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });

    window.addEventListener("resize", setup);
    return () => {
      instances.forEach((d) => d.kill());
      wrap.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return (
    <div ref={wrapRef} className={cn(enhanced ? "overflow-hidden" : "overflow-x-auto", className)}>
      <div
        ref={trackRef}
        className={cn("flex w-max gap-6", enhanced && "cursor-grab active:cursor-grabbing", trackClassName)}
      >
        {children}
      </div>
    </div>
  );
}
