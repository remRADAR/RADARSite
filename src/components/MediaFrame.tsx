import Image from "next/image";
import { cn } from "@/lib/utils";
import type { UnsplashPhoto } from "@/lib/unsplash";

export type MediaTone = "warm" | "cool" | "mono" | "flare";

const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** High-contrast duotone gradients standing in for photography when no Unsplash
 * photo resolved — punchy enough to read as intentional brutalist art direction. */
const TONES: Record<MediaTone, string> = {
  warm: "bg-[linear-gradient(135deg,#0c0c0c_0%,#5a3210_55%,#ff8a3b_100%)]",
  cool: "bg-[linear-gradient(135deg,#0c0c0c_0%,#16303a_55%,#5f97a6_100%)]",
  mono: "bg-[linear-gradient(135deg,#0c0c0c_0%,#2a2a26_55%,#c9c6bd_100%)]",
  flare: "bg-[linear-gradient(135deg,#0c0c0c_0%,#7a1c00_55%,#ff3b00_100%)]",
};

type MediaFrameProps = {
  tone?: MediaTone;
  aspect?: string;
  grain?: boolean;
  label?: string;
  className?: string;
  photo?: UnsplashPhoto | null;
  sizes?: string;
  priority?: boolean;
  /** Set false when nested inside another <Link>/<a> to avoid invalid anchors. */
  attribution?: boolean;
  /**
   * Seamless hover reveal for interactive/clickable media: the image sits
   * gently desaturated + dimmed and eases to full colour with a slow zoom on
   * hover, plus a flare underline that draws in. Reacts to the frame's own
   * hover (group/frame).
   */
  reveal?: boolean;
};

export function MediaFrame({
  tone = "mono",
  aspect = "aspect-[16/9]",
  grain = true,
  label,
  className,
  photo,
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority = false,
  attribution = true,
  reveal = false,
}: MediaFrameProps) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-ink", aspect, className)}>
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "object-cover",
            reveal &&
              "transform-gpu saturate-[0.85] brightness-[0.95] transition-[transform,filter] duration-[800ms] ease-[var(--ease-out)] group-hover/card:scale-[1.06] group-hover/card:saturate-100 group-hover/card:brightness-100"
          )}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0",
            TONES[tone],
            reveal &&
              "transform-gpu transition-transform duration-[800ms] ease-[var(--ease-out)] group-hover/card:scale-[1.06]"
          )}
          aria-hidden
        />
      )}

      {grain && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 mix-blend-overlay",
            photo ? "opacity-[0.06]" : "opacity-[0.16]"
          )}
          style={{ backgroundImage: NOISE_DATA_URI }}
          aria-hidden
        />
      )}

      {reveal && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1 origin-left scale-x-0 bg-flare transition-transform duration-500 ease-[var(--ease-out)] group-hover/card:scale-x-100"
          aria-hidden
        />
      )}

      {label && (
        <span className="absolute bottom-3 left-3 z-10 bg-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-paper">
          {label}
        </span>
      )}
      {photo && attribution && (
        <a
          href={`${photo.credit.link}?utm_source=northlight&utm_medium=referral`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 z-10 font-mono text-[10px] uppercase tracking-widest text-paper/50 transition-colors hover:text-paper"
        >
          {photo.credit.name}
        </a>
      )}
      {photo && !attribution && (
        <span className="absolute bottom-3 right-3 z-10 font-mono text-[10px] uppercase tracking-widest text-paper/50">
          {photo.credit.name}
        </span>
      )}
    </div>
  );
}
