// Single source of truth for every site ticker lane. Each lane is a branded
// set so a ticker's logos are managed in one place instead of inline per page.
//
//   01 / Brand Logos   - the homepage hero ticker (BrandTicker default set)
//   02 / Partnerships  - the About page footer ticker
//   03 / Events        - the stayAKTiV / OMAJIVERSE event ticker set

export type TickerSetId = "brand" | "partnerships" | "events";

export type TickerLogo = {
  src: string;
  alt: string;
  /** Monochrome marks are tinted by the ticker surface via ticker-logo-monochrome. */
  monochrome?: boolean;
};

type TickerSet = { ariaLabel: string; logos: TickerLogo[] };

// 01 / Brand Logos - the homepage hero ticker set (BrandTicker default).
const BRAND_LOGOS: TickerLogo[] = [
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

// 02 / Partnerships - the About page footer ticker. It currently mirrors the
// brand marks for visual parity until dedicated partner logos are supplied;
// replacing this one list is all that is needed to brand the lane.
const PARTNERSHIP_LOGOS: TickerLogo[] = BRAND_LOGOS;

// 03 / Events - the stayAKTiV event ticker set, shared by /stayaktiv and
// /omajiverse. The standalone stayAKTiV vinyl mark (public/stayaktiv-logo.png,
// transparent PNG from the stayAKTiV reference canvas) runs as its own small,
// clearly visible item, replacing the circled badge that was baked into the
// old composite ticker art.
const EVENT_LOGOS: TickerLogo[] = [
  { src: "/stayaktiv/tickers/omaji-verse-2.png", alt: "OMAJI VERSE 2.0" },
  { src: "/stayaktiv/tickers/last-thursdays.png", alt: "THE LAST THURSDAYS" },
  { src: "/stayaktiv-logo.png", alt: "stayAKTiV by RADARCharts" },
  { src: "/stayaktiv/tickers/release-radar-reel.png", alt: "RELEASE RADAR REEL" },
];

export const TICKER_SETS: Record<TickerSetId, TickerSet> = {
  brand: { ariaLabel: "remRADAR brand and partner logos", logos: BRAND_LOGOS },
  partnerships: { ariaLabel: "RADARCharts partnerships", logos: PARTNERSHIP_LOGOS },
  events: { ariaLabel: "stayAKTiV event logos", logos: EVENT_LOGOS },
};
