"use client";
/* eslint-disable @next/next/no-img-element -- CMS hosts are intentionally rendered directly. */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK = "bg-[linear-gradient(135deg,#0c0c0c_0%,#7a1c00_55%,#ff3b00_100%)]";
const RETRY_DELAY_MS = 1200;
/** Initial load plus one automatic retry before the branded placeholder wins. */
const MAX_ATTEMPTS = 2;

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  objectPosition?: string;
  /** Responsive srcset for multi-resolution delivery across devices. */
  srcSet?: string;
  /** Sizes attribute — tells the browser which image width to pick per viewport. */
  sizes?: string;
  /** Fetch priority hint for LCP optimization. */
  fetchPriority?: "high" | "low" | "auto";
};

export function ResilientImage({ src, alt, className, loading = "lazy", objectPosition, srcSet, sizes, fetchPriority }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const probedRef = useRef(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const failed = !src || attempt >= MAX_ATTEMPTS;

  // A new source must never inherit the previous image's failure state.
  useEffect(() => {
    probedRef.current = false;
    setAttempt(0);
    setLoaded(false);
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [src, srcSet]);

  const handleError = () => {
    setLoaded(false);
    if (attempt >= MAX_ATTEMPTS - 1) {
      setAttempt(MAX_ATTEMPTS);
      return;
    }
    if (retryRef.current) clearTimeout(retryRef.current);
    // Re-rendering with the same src prop does not refetch, so the retry is
    // applied by remounting the element (key={attempt}) when the timer fires.
    retryRef.current = setTimeout(() => setAttempt((current) => Math.min(current + 1, MAX_ATTEMPTS)), RETRY_DELAY_MS);
  };

  // Images that failed before hydration never fire a usable error event, so
  // probe the element once per source.
  useEffect(() => {
    if (probedRef.current) return;
    const image = imageRef.current;
    if (!image || !image.complete) return;
    if (image.getAttribute("src") !== src) return; // stale element from a previous source
    probedRef.current = true;
    if (image.naturalWidth > 0) setLoaded(true);
    else handleError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, attempt]);

  if (failed) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center", FALLBACK)} role="img" aria-label={alt + " image unavailable"}>
        <span className="bg-ink/70 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-paper">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      key={attempt}
      ref={imageRef}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      onLoad={() => setLoaded(true)}
      onError={handleError}
      className={cn("transition-opacity duration-500 ease-[var(--ease-out)]", loaded || loading === "eager" ? "opacity-100" : "opacity-0", className)}
      style={{ objectPosition }}
    />
  );
}
