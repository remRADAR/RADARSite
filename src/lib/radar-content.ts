export type HeroSlide = {
  id: string;
  type: "image" | "video";
  src: string;
  mobileSrc?: string;
  alt: string;
  order: number;
  active: boolean;
};

export type HeroConfig = {
  slides: HeroSlide[];
  durationMs: number;
  transition: "fade" | "kenburns";
  reducedMotionFallback: string;
  eyebrow: string;
  headline: string[];
  subheadline: string;
};

export type HomepageContent = {
  ticker: string[];
  pillars: { number: string; label: string; description: string }[];
  proof: { quote: string; attribution: string; partners: string[] };
  cta: { headline: string[]; email: string };
};

export const heroConfig: HeroConfig = {
  slides: [
    {
      id: "studio-signal",
      type: "image",
      src: "/hero-new/banner-1.webp",
      alt: "Artist performing under a single stage light",
      order: 1,
      active: true,
    },
    {
      id: "night-drive",
      type: "image",
      src: "/hero-new/banner-3.webp",
      alt: "Crowd and light at a live music event",
      order: 2,
      active: true,
    },
    {
      id: "press-room",
      type: "image",
      src: "/hero-new/banner-4.webp",
      alt: "Live performance with red and blue stage lighting",
      order: 3,
      active: true,
    },
    {
      id: "hero-banner-four",
      type: "image",
      src: "/hero-new/banner-5.webp",
      alt: "Editorial hero banner from the RADAR archive",
      order: 4,
      active: true,
    },
    {
      id: "hero-banner-five",
      type: "image",
      src: "/hero-new/banner-6.webp",
      alt: "New editorial hero banner from the RADAR archive",
      order: 5,
      active: true,
    },
    {
      id: "hero-banner-six",
      type: "image",
      src: "/hero-new/banner-7.webp",
      alt: "New live music hero banner from the RADAR archive",
      order: 6,
      active: true,
    },
  ],
  durationMs: 5200,
  transition: "kenburns",
  reducedMotionFallback: "/hero-new/banner-1.webp",
  eyebrow: "(01 / Signal)\nArtist development & culture",
  headline: ["ON", "THE", "RADAR"],
  subheadline: "A music ecosystem for artists, releases, stories, and the people moving culture forward.",
};

export const homepageContent: HomepageContent = {
  ticker: ["MOTHERLAND PROJECT", "LIVE ON ARTIZEN", "SEASON 7"],
  pillars: [
    { number: "01", label: "ARTICLES", description: "Editorial Stories" },
    { number: "02", label: "MUSIC", description: "Music #OnTheRADAR" },
    { number: "03", label: "MAGAZINE", description: "Talk To Us Interviews" },
    { number: "04", label: "MOTHERLand", description: "The Music To Her" },
  ],
  proof: {
    quote: "RADAR understands that the release is only the beginning. They gave the whole world around the record a pulse.",
    attribution: "→ Maya Ellis, independent artist",
    partners: ["RADARUnit", "RADARMe", "On The Radar", "RADARArticles", "RADAR Sessions", "RADAR Live"],
  },
  cta: { headline: ["Make", "some", "noise."], email: "hello@radarcharts.com" },
};

export function getActiveHeroSlides() {
  return heroConfig.slides.filter((slide) => slide.active).sort((a, b) => a.order - b.order);
}
