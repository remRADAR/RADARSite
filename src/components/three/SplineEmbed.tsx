"use client";

import dynamic from "next/dynamic";

// Lazily loaded so the Spline runtime (sizeable) only ships when a scene URL is
// actually configured. SSR disabled — Spline is a WebGL/client-only component.
const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => null,
});

/**
 * Drop-in wrapper for a Spline scene, rendered only through SceneGate (already
 * gated behind reduced-motion / touch / no-WebGL).
 *
 * Accepts either:
 *  - a published runtime URL ending in `.splinecode` → renders via @splinetool/react-spline
 *    (transparent bg, tightest integration), or
 *  - a Spline viewer/share link (e.g. my.spline.design/…) → renders via an <iframe>.
 */
export function SplineEmbed({ scene, className }: { scene: string; className?: string }) {
  if (scene.includes(".splinecode")) {
    return <Spline scene={scene} className={className} />;
  }

  return (
    <iframe
      src={scene}
      title="Spline 3D scene"
      className={className}
      style={{ border: 0, width: "100%", height: "100%" }}
      loading="lazy"
      allow="autoplay; fullscreen; xr-spatial-tracking"
    />
  );
}
