"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { getSiteOverridesServerSnapshot, getSiteOverridesSnapshot, parseSiteOverrides, subscribeToSiteOverrides } from "@/lib/site-overrides";

/**
 * Animated "N" monogram. On load the frame wipes up and the N stroke draws
 * itself in; on hover a flare block wipes up behind it, inverting the mark.
 * Colours follow `currentColor`, so it adapts to light/dark contexts.
 * Requires an ancestor with the `group/logo` class for the hover state
 * (the Logo wrapper adds it; standalone users should add it to their link).
 */
export function LogoMark({ className, imageSrc }: { className?: string; imageSrc?: string }) {
  if (imageSrc) {
    return <span aria-hidden className={cn("block h-6 w-6 shrink-0 bg-contain bg-center bg-no-repeat", className)} style={{ backgroundImage: `url(${imageSrc})` }} />;
  }
  return (
    <span className={cn("logo-mark relative block h-6 w-6 shrink-0 overflow-hidden", className)}>
      <span
        aria-hidden
        className="absolute inset-0 origin-bottom scale-y-0 bg-flare transition-transform duration-300 ease-[var(--ease-slam)] group-hover/logo:scale-y-100"
      />
      <svg viewBox="0 0 24 24" className="relative h-full w-full">
        <rect x="1.5" y="1.5" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M6 18 V6.5 L18 17.5 V6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="square"
          pathLength={100}
          className="logo-stroke"
        />
      </svg>
      {/* Idle "signal" sweep — a quick flare scan every few seconds, at rest between. */}
      <span aria-hidden className="logo-scan pointer-events-none absolute inset-x-0 h-[2px] bg-flare" />
    </span>
  );
}

export function Logo({
  href = "/",
  showWordmark = true,
  className,
}: {
  href?: string;
  showWordmark?: boolean;
  className?: string;
}) {
  const overrides = useSyncExternalStore(subscribeToSiteOverrides, getSiteOverridesSnapshot, getSiteOverridesServerSnapshot);
  const logoText = parseSiteOverrides(overrides).logoText;
  return (
    <Link
      href={href}
      aria-label="remRADAR — home"
      className={cn("group/logo flex items-center gap-2.5", className)}
    >
          <LogoMark imageSrc={parseSiteOverrides(overrides).logoImage || "/radar-n-logo.png"} />
      {showWordmark && (
        <span className="font-display text-lg font-extrabold uppercase leading-none tracking-tight">
          {logoText}
        </span>
      )}
    </Link>
  );
}
