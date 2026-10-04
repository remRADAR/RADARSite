"use client";
/* eslint-disable @next/next/no-img-element -- CMS hosts are intentionally rendered directly. */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FALLBACK = "bg-[linear-gradient(135deg,#0c0c0c_0%,#7a1c00_55%,#ff3b00_100%)]";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  objectPosition?: string;
};

export function ResilientImage({ src, alt, className, loading = "lazy", objectPosition }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) setLoaded(true);
  }, [src]);

  if (failed) return <div className={cn("absolute inset-0", FALLBACK)} role="img" aria-label={`${alt} image unavailable`} />;
  return <img ref={imageRef} src={src} alt={alt} loading={loading} decoding="async" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className={cn("transition-opacity duration-500 ease-[var(--ease-out)]", loaded ? "opacity-100" : "opacity-0", className)} style={{ objectPosition }} />;
}
