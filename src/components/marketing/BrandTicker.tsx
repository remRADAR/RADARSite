import Image from "next/image";
import { Marquee } from "@/components/motion/Marquee";
import { TICKER_SETS, type TickerSetId } from "@/lib/ticker-sets";

type BrandTickerProps = {
  className?: string;
  surface?: "ink" | "paper";
  /** Which branded lane this ticker renders; see src/lib/ticker-sets.ts. */
  set?: TickerSetId;
};

export function BrandTicker({ className = "", surface = "ink", set = "brand" }: BrandTickerProps) {
  const onPaper = surface === "paper";
  const ticker = TICKER_SETS[set];

  return (
    <div
      role="group"
      aria-label={ticker.ariaLabel}
      className={`relative z-10 overflow-hidden ${onPaper ? "bg-paper text-ink" : "bg-ink text-paper"} py-3 sm:py-4 ${className}`}
    >
      <Marquee durationSeconds={14} repeat={1}>
        {ticker.logos.map((logo) => (
          <span key={logo.src} className="flex shrink-0 items-center px-2.5 md:px-4">
            <Image
              src={logo.src}
              alt={logo.alt}
              width={800}
              height={148}
              loading="lazy"
              decoding="async"
              className={`h-8 w-auto object-contain sm:h-9 md:h-10${logo.monochrome ? ` ticker-logo-monochrome${onPaper ? " ticker-logo-on-paper" : ""}` : ""}`}
            />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
