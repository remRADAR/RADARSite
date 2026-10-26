"use client";
/* eslint-disable @next/next/no-img-element -- Drive image URLs are browser-delivered to preserve redirect compatibility. */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/lib/radar-content";
import { heroConfig } from "@/lib/radar-content";
import { focalPointToObjectPosition } from "@/lib/hero-image-library";
import {
  heroPreloadSource,
  heroSourceSet,
  isOptimizableHeroSource,
  preloadHeroImage,
} from "@/lib/hero-media";

// Outward-rotating 3D cube: four faces on a preserve-3d cube. A forward step
// rotates the cube -90deg so the right face swings toward the viewer; a
// backward step rotates +90deg so the left face swings in.
const CUBE_FACE_COUNT = 4;
const CUBE_TRANSITION_MS = heroConfig.cubeTransitionMs || 900;
const AUTOPLAY_RESUME_DELAY_MS = 8000;
const SWIPE_THRESHOLD_PX = 40;

type HeroCubeProps = {
  slides: HeroSlide[];
  /** Shown when a slide's source fails to load. */
  fallbackSrc: string;
  /** Resolves the effective source for a slide (site overrides applied). */
  resolveSrc: (slide: HeroSlide) => string;
};

/** Face i (0..3) shows slide (front + i) mod n; face 0 is the front at rest. */
function faceSlidesFor(front: number, slideCount: number) {
  return Array.from({ length: CUBE_FACE_COUNT }, (_unused, i) => (front + i) % slideCount);
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
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const rotationLockRef = useRef(false);
  const pendingTargetRef = useRef<number | null>(null);
  const interactedAtRef = useRef(0);
  const touchStartXRef = useRef<number | null>(null);

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

  // Controlled preloading: the next slide in both directions is decoded ahead
  // of time so a rotation never exposes a blank or half-painted face.
  useEffect(() => {
    const count = slides.length;
    if (count < 2) return;
    const neighbours = [slides[(frontIndex + 1) % count], slides[(frontIndex - 1 + count) % count]];
    neighbours.forEach((slide) => {
      void preloadHeroImage(resolveSrc(slide));
    });
  }, [frontIndex, resolveSrc, slides]);

  const normalize = useCallback(
    (target: number) => {
      const count = slides.length;
      // Bring the arrived face back to slot 0 without an animated spin-back:
      // the front face keeps the same image, so nothing visibly changes.
      setFrontIndex(target);
      setFaceSlides(faceSlidesFor(target, count));
      setRotation(0);
      setAnimating(false);
      rotationLockRef.current = false;
    },
    [slides.length],
  );

  const handleTransitionEnd = useCallback(() => {
    const target = pendingTargetRef.current;
    if (target === null) return;
    pendingTargetRef.current = null;
    normalize(target);
  }, [normalize]);

  const go = useCallback(
    (direction: 1 | -1) => {
      const count = slides.length;
      if (count < 2 || rotationLockRef.current) return;
      const target = (frontIndex + direction + count) % count;
      interactedAtRef.current = Date.now();
      if (reducedMotion) {
        // Reduced motion: swap the front image directly, no rotation.
        setFrontIndex(target);
        setFaceSlides(faceSlidesFor(target, count));
        return;
      }
      rotationLockRef.current = true;
      // The incoming face (right for forward, left for backward) must show
      // the target slide before it starts swinging toward the viewer.
      const incomingFace = direction === 1 ? 1 : CUBE_FACE_COUNT - 1;
      setFaceSlides((current) => {
        const next = current.slice();
        next[incomingFace] = target;
        return next;
      });
      // Guarantee the incoming image is loaded and decoded, then rotate.
      void preloadHeroImage(resolveSrc(slides[target])).then((ok) => {
        if (!ok) setFailed((current) => ({ ...current, [slides[target].id]: true }));
        pendingTargetRef.current = target;
        setAnimating(true);
        setRotation((current) => current - direction * 90);
        // transitionend can be missed (tab hidden, compositor stall); the
        // safety timer keeps the cube state machine from locking up.
        window.setTimeout(handleTransitionEnd, CUBE_TRANSITION_MS + 250);
      });
    },
    [frontIndex, handleTransitionEnd, reducedMotion, resolveSrc, slides],
  );

  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  // Autoplay: forward rotation on the configured dwell, paused briefly after
  // any manual interaction, disabled entirely under reduced motion.
  useEffect(() => {
    if (reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (rotationLockRef.current) return;
      if (Date.now() - interactedAtRef.current < AUTOPLAY_RESUME_DELAY_MS) return;
      goRef.current(1);
    }, heroConfig.durationMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  const renderFace = (faceIndex: number, slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide) return null;
    const src = failed[slide.id] ? fallbackSrc : resolveSrc(slide);
    const fit = slide.fit || "cover";
    const objectPosition = focalPointToObjectPosition(slide.focalPoint);
    const sourceSet = heroSourceSet(src);
    const optimizable = isOptimizableHeroSource(src);
    const isFront = faceIndex === 0;
    const handleError = () => setFailed((current) => ({ ...current, [slide.id]: true }));

    const renderImage = (className: string, alt: string) => {
      if (optimizable) {
        return (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="100vw"
            quality={100}
            priority={isFront}
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
          sizes="100vw"
          loading={isFront ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isFront ? "high" : "auto"}
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
        key={"hero-cube-face-" + faceIndex}
        className="hero-cube-face absolute inset-0 overflow-hidden bg-ink"
        style={{ transform: "rotateY(" + faceIndex * 90 + "deg) translateZ(" + faceDepth + "px)" }}
      >
        {fit === "contain" ? (
          <>
            {/* Portrait-first: a blurred, focal-positioned cover copy fills the
                face while the contained foreground keeps the full artwork. */}
            <div className="hero-cube-backdrop absolute inset-0 h-full w-full overflow-hidden" aria-hidden>
              {renderImage(coverClass, "")}
            </div>
            {renderImage(containClass, slide.alt)}
          </>
        ) : (
          renderImage(coverClass, slide.alt)
        )}
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
          style={{
            transform: sceneTransform,
            transition: animating ? "transform " + CUBE_TRANSITION_MS + "ms var(--ease-in-out)" : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {faceSlides.map((slideIndex, faceIndex) => renderFace(faceIndex, slideIndex))}
        </div>
      </div>

      <div className="absolute right-4 top-32 z-20 flex flex-col gap-2 md:right-8 md:top-36">
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
      </div>

      <p className="sr-only" aria-live="polite">
        {currentSlide ? currentSlide.alt : ""}
      </p>
    </>
  );
}
