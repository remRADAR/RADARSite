/**
 * Centralized motion tokens. Every GSAP timeline and CSS transition should
 * reference these so the whole site reads as one system: hard brutalist
 * visuals, but buttery, deliberate motion underneath.
 */

export const EASE = {
  /** Decisive "slam" settle — expo-out, for headline/word reveals. */
  slam: "expo.out",
  out: "power3.out",
  inOut: "power2.inOut",
  soft: "power1.out",
} as const;

export const DURATION = {
  fast: 0.4,
  base: 0.6,
  slow: 0.9,
  cinematic: 1.1,
} as const;

/** Matches --ease-out in globals.css, for raw CSS/Tailwind transitions. */
export const CSS_EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
export const CSS_EASE_SLAM = "cubic-bezier(0.16, 1, 0.3, 1)";

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
