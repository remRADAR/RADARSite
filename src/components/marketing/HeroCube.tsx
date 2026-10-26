"use client";
/* eslint-disable @next/next/no-img-element -- Google Drive URLs remain browser-delivered to preserve redirect compatibility. */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HeroSlide } from "@/lib/radar-content";
import { heroConfig } from "@/lib/radar-content";
import { focalPointToObjectPosition } from "@/lib/hero-image-library";
import {
  heroSourceSet,
  isOptimizableHeroSource,
  preloadHeroImage,
} from "@/lib/hero-media";

// Outward-rotating 3D cube: four faces on a preserve-3d cube. A forward step
// rotates the cube -90deg so the right face swings toward the viewer; a
// backward step rotates +90deg so the left face swings in.
const CUBE_FACE_COUNT = 4;
const DESKTOP_TRIPTYCH_COUNT = 3;
const CUBE_TRANSITION_MS = heroConfig.cubeTransitionMs || 900;
const AUTOPLAY_RESUME_DELAY_MS = 8000;
const SWIPE_THRESHOLD_PX = 40;

type HeroCubeProps = {
  /** Shown when a slide's source fails to load. */
  fallbackSrc: string;
  /** Resolves the effective source for a slide (site overrides applied). */
  resolveSrc: (slide: HeroSlide) => string;
  slides: HeroSlide[];
};

type ImageFailureStage = "fallback" | "terminal";

/** Face i (0..3) shows slide (front + i) mod n; face 0 is the front at rest. */
function faceSlidesFor(front: number, slideCount: number) {
  return Array.from({ length: CUBE_FACE_COUNT }, (_unused, i) => (front + i) % slideCount);
}

/** Each desktop face is a seamless window of three consecutive images. */
function triptychSlidesFor(front: number, slideCount: number) {
  if (slideCount === 0) return [];
  return Array.from(
    { length: Math.min(DESKTOP_TRIPTYCH_COUNT, slideCount) },
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

export function HeroCube({ slides, fallbackSrc, resolveSrc }: HeroCubeProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [faceDepth, setFaceDepth] = useState(0);
  const [frontIndex, setFrontIndex] = useState(0);
  const [faceSlides, setFaceSlides] = useState<number[]>(() =>
    slides.length > 0 ? faceSlidesFor(0, slides.length) : [],
  );
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imageFailures, setImageFailures] = useState<Record<string, ImageFailureStage>>({});
  const [autoplayPaused, setAutoplayPaused] = useState(false);
  const [controlsFocused, setControlsFocused] = useState(false);
  const autoplayPausedRef = useRef(false);
  const controlsFocusedRef = useRef(false);
  const rotationLockRef = useRef(false);
  const pendingTargetRef = useRef<number | null>(null);
  const shuffleBagRef = useRef<number[]>([]);
  const transitionTokenRef = useRef(0);
  const transitionTimeoutRef = useRef<number | null>(null);
  const interactedAtRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);

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

  // Face geometry: each face sits at translateZ(half the scene width) so the
  // four faces form a genuine cube sized to the hero.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const update = () => setFaceDepth(scene.clientWidth / 2);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // A timed-out preload or transition must not be able to finish a later turn.
  useEffect(
    () => () => {
      transitionTokenRef.current += 1;
      pendingTargetRef.current = null;
      rotationLockRef.current = false;
      clearTransitionTimeout();
    },
    [clearTransitionTimeout],
  );

  // Controlled preloading: every image in the next and previous triptychs is
  // decoded ahead of time so a turn never exposes a blank or half-painted face.
  useEffect(() => {
    const count = slides.length;
    if (count < 2) return;
    if (shuffleBagRef.current.length === 0) {
      shuffleBagRef.current = shuffledSlideIndices(frontIndex, count);
    }
    const shuffledStart = shuffleBagRef.current[0];
    const neighbourStarts = [frontIndex + 1, frontIndex - 1];
    if (shuffledStart !== undefined) neighbourStarts.push(shuffledStart);
    const neighbourIndices = neighbourStarts.flatMap((start) =>
      triptychSlidesFor(start, count),
    );
    const neighbours = new Map(neighbourIndices.map((index) => [slides[index].id, slides[index]]));
    neighbours.forEach((slide) => {
      void preloadHeroImage(resolveSrc(slide));
    });
  }, [frontIndex, resolveSrc, slides]);

  const completeTransition = useCallback(
    (token: number, target: number) => {
      if (token !== transitionTokenRef.current || pendingTargetRef.current !== target) return;
      clearTransitionTimeout();
      pendingTargetRef.current = null;
      const count = slides.length;
      if (count === 0) {
        setFaceSlides([]);
        setAnimating(false);
        setRotation(0);
        rotationLockRef.current = false;
        return;
      }
      const normalizedTarget = ((target % count) + count) % count;
      // Keep the arrived face in front and silently restore the cube to rest.
      setFrontIndex(normalizedTarget);
      setFaceSlides(faceSlidesFor(normalizedTarget, count));
      setRotation(0);
      setAnimating(false);
      rotationLockRef.current = false;
    },
    [clearTransitionTimeout, slides.length],
  );

  const handleTransitionEnd = useCallback(() => {
    const target = pendingTargetRef.current;
    if (target === null) return;
    completeTransition(transitionTokenRef.current, target);
  }, [completeTransition]);

  const go = useCallback(
    (direction: 1 | -1, shuffle = false) => {
      const count = slides.length;
      if (count < 2 || rotationLockRef.current) return;
      let target: number;
      if (shuffle) {
        if (shuffleBagRef.current.length === 0) {
          shuffleBagRef.current = shuffledSlideIndices(frontIndex, count);
        }
        target = shuffleBagRef.current.shift() ?? (frontIndex + direction + count) % count;
      } else {
        shuffleBagRef.current = [];
        target = (frontIndex + direction + count) % count;
        interactedAtRef.current = Date.now();
      }
      if (reducedMotion) {
        // Reduced motion: swap the front image directly, no rotation.
        setFrontIndex(target);
        setFaceSlides(faceSlidesFor(target, count));
        return;
      }

      clearTransitionTimeout();
      const token = ++transitionTokenRef.current;
      rotationLockRef.current = true;
      // The incoming face (right for forward, left for backward) must show
      // the target slide before it starts swinging toward the viewer.
      const incomingFace = direction === 1 ? 1 : CUBE_FACE_COUNT - 1;
      setFaceSlides((current) => {
        const next = current.slice();
        next[incomingFace] = target;
        return next;
      });
      // Guarantee all three incoming desktop images are decoded, then rotate.
      const incomingSlides = triptychSlidesFor(target, count).map((index) => slides[index]);
      void Promise.all(incomingSlides.map(async (slide) => {
        const ok = await preloadHeroImage(resolveSrc(slide));
        if (!ok) markImageFailure(slide.id, false);
      })).then(() => {
        if (token !== transitionTokenRef.current) return;
        pendingTargetRef.current = target;
        setAnimating(true);
        setRotation((current) => current - direction * 90);
        // transitionend can be missed (tab hidden, compositor stall); the
        // token-guarded safety timer cannot complete a later rotation.
        transitionTimeoutRef.current = window.setTimeout(
          () => completeTransition(token, target),
          CUBE_TRANSITION_MS + 250,
        );
      });
    },
    [clearTransitionTimeout, completeTransition, frontIndex, markImageFailure, reducedMotion, resolveSrc, slides],
  );

  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  // Autoplay respects reduced motion, an explicit pause, and keyboard focus
  // within the controls; manual turns also get a brief reading pause.
  useEffect(() => {
    if (reducedMotion || autoplayPaused || controlsFocused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (autoplayPausedRef.current || controlsFocusedRef.current || document.visibilityState === "hidden" || rotationLockRef.current) return;
      if (Date.now() - interactedAtRef.current < AUTOPLAY_RESUME_DELAY_MS) return;
      goRef.current(1, true);
    }, heroConfig.durationMs);
    return () => window.clearInterval(timer);
  }, [autoplayPaused, controlsFocused, reducedMotion, slides.length]);

  const renderFace = (faceIndex: number, slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide) return null;
    const failureStage = imageFailures[slide.id];
    const isFront = faceIndex === 0;
    const faceStyle = { transform: "rotateY(" + faceIndex * 90 + "deg) translateZ(" + faceDepth + "px)" };
    const faceClass = "hero-cube-face absolute inset-0 overflow-hidden bg-ink";
    const renderSlidePanel = (panelSlide: HeroSlide, prioritize: boolean, desktopPanel: boolean, panelIndex: number) => {
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

      const renderImage = (className: string, alt: string, imagePriority: boolean) => {
      if (optimizable) {
        return (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 767px) 120vw, 140vw"
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
          sizes="(max-width: 767px) 120vw, 140vw"
          loading={imagePriority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={imagePriority ? "high" : "auto"}
          onError={handleError}
          className={className}
          style={{ objectPosition }}
        />
      );
      };

      const coverClass = "hero-image absolute inset-0 h-full w-full object-cover";
      const containClass = "hero-image absolute inset-0 h-full w-full object-contain";

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
              <div className="hero-cube-backdrop absolute inset-0 h-full w-full overflow-hidden" aria-hidden>
                {renderImage(coverClass, "", false)}
              </div>
              {renderImage(containClass, panelSlide.alt, prioritize)}
            </>
          ) : (
            renderImage(coverClass, panelSlide.alt, prioritize)
          )}
        </div>
      );
    };

    const triptych = triptychSlidesFor(slideIndex, slides.length).map((index) => slides[index]);
    return (
      <div
        key={"hero-cube-face-" + faceIndex}
        className={faceClass}
        data-hero-image-fallback={failureStage ?? "none"}
        data-hero-triptych-count={triptych.length}
        style={faceStyle}
      >
        <div className="hidden h-full w-full grid-cols-3 md:grid">
          {triptych.map((panelSlide, panelIndex) =>
            renderSlidePanel(panelSlide, isFront && panelIndex === 0, true, panelIndex),
          )}
        </div>
        <div className="h-full w-full md:hidden" data-hero-mobile-image>
          {renderSlidePanel(slide, false, false, 0)}
        </div>
      </div>
    );
  };

  const currentSlide = slides[frontIndex];
  const sceneTransform = "rotateY(" + rotation + "deg)";

  return (
    <>
      <div
        data-hero-panel
        ref={sceneRef}
        aria-hidden
        className="hero-cube-scene absolute inset-0 overflow-hidden bg-ink"
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
        <div
          className="hero-cube absolute inset-0"
          data-animating={animating ? "true" : "false"}
          data-rotation={rotation}
          style={{
            transform: sceneTransform,
            transition: animating ? "transform " + CUBE_TRANSITION_MS + "ms var(--ease-in-out)" : "none",
          }}
          onTransitionEnd={(event) => {
            if (event.target === event.currentTarget && event.propertyName === "transform") handleTransitionEnd();
          }}
        >
          {faceSlides.map((slideIndex, faceIndex) => renderFace(faceIndex, slideIndex))}
        </div>
      </div>

      <div
        className="absolute right-4 top-32 z-20 flex flex-col gap-2 md:right-8 md:top-36"
        role="group"
        aria-label="Hero image controls"
        data-hero-controls
        onFocusCapture={() => {
          controlsFocusedRef.current = true;
          setControlsFocused(true);
        }}
        onBlurCapture={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!next || !event.currentTarget.contains(next)) {
            controlsFocusedRef.current = false;
            setControlsFocused(false);
          }
        }}
      >
        <button
          type="button"
          onClick={() => goRef.current(-1)}
          aria-label="Previous hero image"
          className="flex h-10 w-10 items-center justify-center border border-white/25 bg-black/30 text-paper/80 backdrop-blur-[2px] transition-colors hover:border-white/60 hover:text-paper"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => goRef.current(1)}
          aria-label="Next hero image"
          className="flex h-10 w-10 items-center justify-center border border-white/25 bg-black/30 text-paper/80 backdrop-blur-[2px] transition-colors hover:border-white/60 hover:text-paper"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        {slides.length > 1 && !reducedMotion ? (
          <button
          type="button"
          onClick={() => {
            const next = !autoplayPausedRef.current;
            autoplayPausedRef.current = next;
            setAutoplayPaused(next);
          }}
            aria-label={autoplayPaused ? "Resume hero slideshow" : "Pause hero slideshow"}
            aria-pressed={autoplayPaused}
            className="flex h-10 w-10 items-center justify-center border border-white/25 bg-black/30 text-paper/80 backdrop-blur-[2px] transition-colors hover:border-white/60 hover:text-paper"
          >
            {autoplayPaused ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {currentSlide ? currentSlide.alt : ""}
      </p>
    </>
  );
}
