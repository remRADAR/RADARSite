"use client";
/* eslint-disable @next/next/no-img-element -- CMS hosts are intentionally rendered directly. */

import { useState } from "react";
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
  if (failed) return <div className={cn("absolute inset-0", FALLBACK)} role="img" aria-label={`${alt} image unavailable`} />;
  return <img src={src} alt={alt} loading={loading} decoding="async" onError={() => setFailed(true)} className={className} style={{ objectPosition }} />;
}
