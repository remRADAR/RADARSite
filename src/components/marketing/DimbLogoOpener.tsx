"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./DimbLogoOpener.module.css";

/**
 * Frame 2 of the DuMb podcast opener: the retained animated logotype.
 *
 * The supplied asset is a white-background GIF. It is committed to the repo at
 * public/media/podcast/logo.gif and is never hot-linked. Because a GIF cannot
 * carry reliable alpha, the component serves pre-derived transparent animated
 * WebP variants (built from that same GIF, black artwork preserved) and falls
 * back to the original GIF only if a variant fails to load.
 *
 * The artwork is black, so on a dark page it would disappear. The CSS applies a
 * controlled white edge/glow in dark mode and a subtle black hover in light
 * mode, both driven by the shared theme tokens rather than per-page overrides.
 */
const VARIANTS = [
  { src: "/media/podcast/logo-anim-320.webp", width: 320 },
  { src: "/media/podcast/logo-anim-420.webp", width: 420 },
  { src: "/media/podcast/logo-anim-640.webp", width: 640 },
];
const POSTER_SRC = "/media/podcast/logo-anim-poster.png";
const GIF_FALLBACK_SRC = "/media/podcast/logo.gif";

export function DimbLogoOpener() {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [variantFailed, setVariantFailed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={styles.opener + (inView ? " " + styles.openerIn : "")}
      aria-label="DuMb logotype"
    >
      <div className={styles.inner}>
        <picture className={styles.logoFrame}>
          {!variantFailed ? (
            <source
              type="image/webp"
              srcSet={VARIANTS.map((v) => `${v.src} ${v.width}w`).join(", ")}
              sizes="(max-width: 480px) 88vw, (max-width: 1024px) 70vw, min(56rem, 78vw)"
            />
          ) : null}
          <img
            className={styles.suppliedLogo}
            src={variantFailed ? GIF_FALLBACK_SRC : POSTER_SRC}
            alt="DuMb — Deep in my bones"
            width={702}
            height={195}
            decoding="async"
            onError={() => setVariantFailed(true)}
          />
        </picture>
      </div>
    </section>
  );
}
