"use client";
/* eslint-disable @next/next/no-img-element -- Legacy Drive URLs remain browser-delivered to preserve redirect compatibility. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { HeroSlide } from "@/lib/radar-content";
import { heroConfig } from "@/lib/radar-content";
import { focalPointToObjectPosition } from "@/lib/hero-image-library";
import {
  heroSourceSet,
  isOptimizableHeroSource,
  preloadHeroImage,
} from "@/lib/hero-media";

// Fixed cinematic hero engine. Two stacked full-bleed film layers crossfade on
// opacity while every panel drifts on a subtle Ken Burns move. Mobile shows a
// single dominant image; md+ composites a seamless three-panel scene. No 3D
// geometry and no layout work during a turn — only opacity and transform run.
// The film is autoplay-only: there are no visible controls, the images advance
// on the configured cadence, and touch swipe remains the only manual gesture.
const DESKTOP_PANEL_COUNT = 3;
const FADE_MS = heroConfig.fadeTransitionMs || 1100;
const AUTOPLAY_RESUME_DELAY_MS = 8000;
const SWIPE_THRESHOLD_PX = 40;

type HeroCinematicProps = {
  /** Shown when a slide's source fails to load. */
  fallbackSrc: string;
  /** Resolves the effective source for a slide (site overrides applied). */
  resolveSrc: (slide: HeroSlide) => string;
  slides: HeroSlide[];
};

type ImageFailureStage = "fallback" | "terminal";

/** The desktop scene is a seamless window of consecutive images. */
function sceneSlidesFor(front: number, slideCount: number) {
  if (slideCount === 0) return [];
  return Array.from(
    { length: Math.min(DESKTOP_PANEL_COUNT, slideCount) },
    (_unused, offset) => ((front + offset) % slideCount + slideCount) % slideCount,
  );
}

/** A random order that visits every other slide once before repeating. */
function shuffledSlideIndices(current: number, slideCount: number) {
  const indices = Array.from({ length: slideCount }, (_unused, index) => index)
    .filter((index) => index !== current);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

export function HeroCinematic({ slides, fallbackSrc, resolveSrc }: HeroCinematicProps) {
  const [activeLayer, setActiveLayer] = useState(0);
  const [frontByLayer, setFrontByLayer] = useState<number[]>([0, 0]);
  const [incomingLayer, setIncomingLayer] = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [frontIndex, setFrontIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imageFailures, setImageFailures] = useState<Record<string, ImageFailureStage>>({});
  const transitionLockRef = useRef(false);
  const shuffleBagRef = useRef<number[]>([]);
  const transitionTokenRef = useRef(0);
  const transitionTimeoutRef = useRef<number | null>(null);
  const interactedAtRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);
  const activeLayerRef = useRef(0);
  const frontIndexRef = useRef(0);

  useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);

  useEffect(() => {
    frontIndexRef.current = frontIndex;
  }, [frontIndex]);

  const clearTransitionTimeout = useCallback(() => {
    if (transitionTimeoutRef.current === null) return;
    window.clearTimeout(transitionTimeoutRef.current);
    transitionTimeoutRef.current = null;
  }, []);

  const markImageFailure = useCallback((slideId: string, failedFallback: boolean) => {
    setImageFailures((current) => {
      const stage = current[slideId];
      if (stage === "terminal" || (stage === "fallback" && !failedFallback)) return current;
      return { ...current, [slideId]: failedFallback ? "terminal" : "fallback" };
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // A timed-out preload or fade must not be able to finish a later turn.
  useEffect(
    () => () => {
      transitionTokenRef.current += 1;
      transitionLockRef.current = false;
      clearTransitionTimeout();
    },
    [clearTransitionTimeout],
  );

  // Controlled preloading: every image in the next and previous scenes is
  // decoded ahead of time so a fade never exposes a blank or half-painted panel.
  useEffect(() => {
    const count = slides.length;
    if (count < 2) return;
    if (shuffleBagRef.current.length === 0) {
      shuffleBagRef.current = shuffledSlideIndices(frontIndex, count);
    }
    const shuffledStart = shuffleBagRef.current[0];
    const sceneStarts = [frontIndex + 1, frontIndex - 1];
    if (shuffledStart !== undefined) sceneStarts.push(shuffledStart);
    const sceneIndices = sceneStarts.flatMap((start) => sceneSlidesFor(start, count));
    const neighbours = new Map(sceneIndices.map((index) => [slides[index].id, slides[index]]));
    neighbours.forEach((slide) => {
      void preloadHeroImage(resolveSrc(slide));
    });
  }, [frontIndex, resolveSrc, slides]);

  const completeFade = useCallback(
    (token: number, target: number, layer: number) => {
      if (token !== transitionTokenRef.current) return;
      clearTransitionTimeout();
      setFading(false);
      setIncomingLayer(null);
      setActiveLayer(layer);
      setFrontIndex(target);
      transitionLockRef.current = false;
    },
    [clearTransitionTimeout],
  );

  const go = useCallback(
    (direction: 1 | -1, shuffle = false) => {
      const count = slides.length;
      if (count < 2 || transitionLockRef.current) return;
      let target: number;
      if (shuffle) {
        if (shuffleBagRef.current.length === 0) {
          shuffleBagRef.current = shuffledSlideIndices(frontIndexRef.current, count);
        }
        target = shuffleBagRef.current.shift() ?? (frontIndexRef.current + direction + count) % count;
      } else {
        shuffleBagRef.current = [];
        target = (frontIndexRef.current + direction + count) % count;
        interactedAtRef.current = Date.now();
      }
      if (reducedMotion) {
        // Reduced motion: swap the scene directly, no fade, no drift.
        setFrontIndex(target);
        setFrontByLayer([target, target]);
        return;
      }

      clearTransitionTimeout();
      const token = ++transitionTokenRef.current;
      transitionLockRef.current = true;
      // Stage the incoming scene on the idle layer only after every image in
      // it has been loaded and decoded, then crossfade it over the current one.
      const incoming = 1 - activeLayerRef.current;
      const scene = sceneSlidesFor(target, count).map((index) => slides[index]);
      void Promise.all(scene.map(async (slide) => {
        const ok = await preloadHeroImage(resolveSrc(slide));
        if (!ok) markImageFailure(slide.id, false);
      })).then(() => {
        if (token !== transitionTokenRef.current) return;
        setFrontByLayer((current) => {
          const next = current.slice();
          next[incoming] = target;
          return next;
        });
        setIncomingLayer(incoming);
        setFading(true);
        // transitionend can be missed (tab hidden, compositor stall); the
        // token-guarded safety timer cannot complete a later fade.
        transitionTimeoutRef.current = window.setTimeout(
          () => completeFade(token, target, incoming),
          FADE_MS + 250,
        );
      });
    },
    [clearTransitionTimeout, completeFade, markImageFailure, reducedMotion, resolveSrc, slides],
  );

  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  // Autoplay respects reduced motion and holds off while the tab is hidden or
  // a fade is already in flight; a manual swipe still gets a brief pause.
  useEffect(() => {
    if (reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "hidden" || transitionLockRef.current) return;
      if (Date.now() - interactedAtRef.current < AUTOPLAY_RESUME_DELAY_MS) return;
      goRef.current(1, true);
    }, heroConfig.durationMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  const renderPanel = (panelSlide: HeroSlide, prioritize: boolean, desktopPanel: boolean, panelIndex: number) => {
    const panelFailure = imageFailures[panelSlide.id];
    const isFallback = panelFailure === "fallback";
    const src = isFallback ? fallbackSrc : resolveSrc(panelSlide);
    const fit = panelSlide.fit || "cover";
    const objectPosition = focalPointToObjectPosition(panelSlide.focalPoint);
    const sourceSet = heroSourceSet(src);
    const optimizable = isOptimizableHeroSource(src);
    const handleError = () => markImageFailure(panelSlide.id, isFallback);
    const panelClass = "relative h-full min-w-0 flex-1 overflow-hidden bg-ink";
    const panelAttributes = desktopPanel ? { "data-hero-triptych-panel": "true", "data-hero-panel-index": panelIndex } : {};

    if (panelFailure === "terminal") {
      return (
        <div key={panelSlide.id} className={panelClass} {...panelAttributes} data-hero-image-fallback="terminal">
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-black to-ink" aria-hidden />
        </div>
      );
    }

    // Alternating drift directions keep the merged scene alive without any
    // two neighbouring panels moving in lockstep.
    const driftClass = panelIndex % 2 === 0 ? " hero-kenburns" : " hero-kenburns hero-kenburns-alt";
    const coverClass = "hero-image" + driftClass + " absolute inset-0 h-full w-full object-cover";
    const containClass = "hero-image" + driftClass + " absolute inset-0 h-full w-full object-contain";
    const backdropClass = "hero-image absolute inset-0 h-full w-full object-cover";

    const renderImage = (className: string, alt: string, imagePriority: boolean) => {
      if (optimizable) {
        return (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 767px) 100vw, 34vw"
            quality={75}
            priority={imagePriority}
            onError={handleError}
            className={className}
            style={{ objectPosition }}
          />
        );
      }
      return (
        <img
          src={src}
          alt={alt}
          srcSet={sourceSet}
          sizes="(max-width: 767px) 100vw, 34vw"
          loading={imagePriority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={imagePriority ? "high" : "auto"}
          onError={handleError}
          className={className}
          style={{ objectPosition }}
        />
      );
    };

    return (
      <div
        key={panelSlide.id}
        className={panelClass}
        {...panelAttributes}
        data-hero-image-fallback={panelFailure ?? "none"}
        data-hero-slide-id={panelSlide.id}
      >
        {fit === "contain" ? (
          <>
            {/* Portrait-first: a blurred cover fills the panel while the
                contained foreground preserves the full artwork. */}
            <div className="hero-film-backdrop absolute inset-0 h-full w-full overflow-hidden" aria-hidden>
              {renderImage(backdropClass, "", false)}
            </div>
            {renderImage(containClass, panelSlide.alt, prioritize)}
          </>
        ) : (
          renderImage(coverClass, panelSlide.alt, prioritize)
        )}
      </div>
    );
  };

  const renderLayer = (layerIndex: number) => {
    const front = frontByLayer[layerIndex] ?? 0;
    const sceneIndices = sceneSlidesFor(front, slides.length);
    const isActive = layerIndex === activeLayer;
    const isIncoming = fading && incomingLayer === layerIndex;
    const opacity = isActive || isIncoming ? 1 : 0;
    return (
      <div
        key={"hero-film-layer-" + layerIndex}
        data-hero-film-layer={layerIndex}
        data-active={isActive ? "true" : "false"}
        className="hero-film-layer absolute inset-0 bg-ink"
        style={{
          opacity,
          zIndex: isIncoming ? 2 : 1,
          transition: isIncoming ? "opacity " + FADE_MS + "ms var(--ease-in-out)" : "none",
        }}
      >
        <div className="hero-desktop-scene hidden h-full w-full grid-cols-3 md:grid">
          {sceneIndices.map((index, panelIndex) =>
            renderPanel(slides[index], isActive && panelIndex === 0, true, panelIndex),
          )}
        </div>
        <div className="hero-mobile-scene h-full w-full md:hidden" data-hero-mobile-image>
          {slides[front] ? renderPanel(slides[front], isActive, false, 0) : null}
        </div>
      </div>
    );
  };

  const currentSlide = slides[frontIndex];
  const driftDuration = heroConfig.durationMs + FADE_MS + "ms";
  const sceneStyle = { "--hero-drift-duration": driftDuration } as CSSProperties;

  return (
    <>
      <div
        data-hero-panel
        data-animating={fading ? "true" : "false"}
        aria-hidden
        className="hero-film absolute inset-0 overflow-hidden bg-ink"
        style={sceneStyle}
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          const start = touchStartXRef.current;
          touchStartXRef.current = null;
          if (start === null) return;
          const delta = event.changedTouches[0].clientX - start;
          if (delta <= -SWIPE_THRESHOLD_PX) goRef.current(1);
          else if (delta >= SWIPE_THRESHOLD_PX) goRef.current(-1);
        }}
      >
        {[0, 1].map((layerIndex) => renderLayer(layerIndex))}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {currentSlide ? currentSlide.alt : ""}
      </p>
    </>
  );
}
