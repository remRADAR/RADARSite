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
  overlayStrength: number;
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
      src: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=2200&q=85",
      alt: "Artist performing under a single stage light",
      order: 1,
      active: true,
    },
    {
      id: "night-drive",
      type: "image",
      src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2200&q=85",
      alt: "Crowd and light at a live music event",
      order: 2,
      active: true,
    },
    {
      id: "press-room",
      type: "image",
      src: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=2200&q=85",
      alt: "Live performance with red and blue stage lighting",
      order: 3,
      active: true,
    },
  ],
  durationMs: 5200,
  transition: "kenburns",
  overlayStrength: 0.58,
  reducedMotionFallback: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=2200&q=85",
  eyebrow: "(01 / Signal)\nArtist development & culture",
  headline: ["Put it", "on the", "RADAR."],
  subheadline: "A music ecosystem for artists, releases, stories, and the people moving culture forward.",
};

export const homepageContent: HomepageContent = {
  ticker: ["Artist Spotlight", "Releases", "RADARArticles", "On The Radar", "Campaigns"],
  pillars: [
    { number: "01", label: "Artist", description: "Long-term direction for artists with something real to say." },
    { number: "02", label: "Release", description: "World-building around the records that deserve a wider signal." },
    { number: "03", label: "Editorial", description: "Stories, sessions, and context for the culture around the music." },
    { number: "04", label: "Campaign", description: "Creative systems that move from first listen to lasting memory." },
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
