import Image from "next/image";
import Link from "next/link";
import { Marquee } from "@/components/motion/Marquee";
import { TICKER_SETS, type TickerSetId, type TickerLogo } from "@/lib/ticker-sets";

type BrandTickerProps = {
  className?: string;
  surface?: "ink" | "paper";
  set?: TickerSetId;
};

function LogoMark({ logo, onPaper }: { logo: TickerLogo; onPaper: boolean }) {
  const image = (
    <Image
      src={logo.src}
      alt={logo.name}
      width={800}
      height={148}
      loading="lazy"
      decoding="async"
      unoptimized
      className={`h-8 w-auto object-contain sm:h-9 md:h-10${logo.monochrome ? ` ticker-logo-monochrome${onPaper ? " ticker-logo-on-paper" : ""}` : ""}`}
    />
  );

  return logo.href ? <Link href={logo.href}>{image}</Link> : image;
}

export function BrandTicker({ className = "", surface = "ink", set = "brands" }: BrandTickerProps) {
  const onPaper = surface === "paper";
  const ticker = TICKER_SETS[set];

  return (
    <div
      role="group"
      aria-label={ticker.ariaLabel}
      className={`relative z-10 overflow-hidden ${onPaper ? "bg-paper text-ink" : "bg-ink text-paper"} py-3 sm:py-4 ${className}`}
    >
      {ticker.logos.length ? (
        <Marquee durationSeconds={14} repeat={1}>
          {ticker.logos.map((logo) => (
            <span key={`${logo.src}-${logo.order}`} className="flex shrink-0 items-center px-2.5 md:px-4">
              <LogoMark logo={logo} onPaper={onPaper} />
            </span>
          ))}
        </Marquee>
      ) : (
        <p className="px-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.14em]">Partners ticker ready for approved logos.</p>
      )}
    </div>
  );
}
