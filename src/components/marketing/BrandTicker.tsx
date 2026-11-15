import Image from "next/image";
import { Marquee } from "@/components/motion/Marquee";

const BRAND_TICKER_LOGOS = [
  { src: "/brand-ticker/brand-01.webp", alt: "RADARCharts", monochrome: true },
  { src: "/brand-ticker/brand-02.webp", alt: "remRADAR" },
  { src: "/brand-ticker/brand-03.webp", alt: "Brand emblem" },
  { src: "/brand-ticker/brand-04.webp", alt: "Talk to Us", monochrome: true },
  { src: "/brand-ticker/brand-05.webp", alt: "Top 100 Abuja Playlist" },
  { src: "/brand-ticker/brand-06.webp", alt: "Xcape brand mark" },
  { src: "/brand-ticker/brand-07.webp", alt: "Flame emblem" },
  { src: "/brand-ticker/brand-08.webp", alt: "XCAPE" },
  { src: "/brand-ticker/brand-09.webp", alt: "Top 100 Abuja Playlist" },
  { src: "/brand-ticker/brand-10.webp", alt: "Omaji Verse 2.0" },
  { src: "/brand-ticker/brand-11.webp", alt: "RADAR Legacies", monochrome: true },
  { src: "/brand-ticker/brand-12.webp", alt: "XCAPE Plan", monochrome: true },
  { src: "/brand-ticker/brand-13.webp", alt: "Creative Culture", monochrome: true },
  { src: "/brand-ticker/brand-14.webp", alt: "AfroCamp", monochrome: true },
];

type BrandTickerProps = {
  className?: string;
};

export function BrandTicker({ className = "" }: BrandTickerProps) {
  return (
    <div
      role="group"
      aria-label="remRADAR brand and partner logos"
      className={`relative z-10 overflow-hidden bg-ink py-3 text-paper sm:py-4 ${className}`}
    >
      <Marquee durationSeconds={14} repeat={1}>
        {BRAND_TICKER_LOGOS.map((logo) => (
          <span key={logo.src} className="flex shrink-0 items-center px-2.5 md:px-4">
            <Image
              src={logo.src}
              alt={logo.alt}
              width={800}
              height={148}
              unoptimized
              loading="eager"
              className={`h-8 w-auto object-contain sm:h-9 md:h-10${logo.monochrome ? " ticker-logo-monochrome" : ""}`}
            />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
