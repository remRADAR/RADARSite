import { getLibraryHeroSlides, isHeroLibraryConfigured } from "./hero-image-library";

export type HeroSlide = {
  id: string;
  type: "image" | "video";
  src: string;
  mobileSrc?: string;
  alt: string;
  order: number;
  active: boolean;
  /** 0-100 percentage point kept in frame whenever the layout crops. */
  focalPoint?: { x: number; y: number };
  /** "contain" keeps the full portrait visible; "cover" fills the frame. */
  fit?: "contain" | "cover";
};

export type HeroConfig = {
  slides: HeroSlide[];
  durationMs: number;
  /** Cube rotation duration per transition (brief: 800-1000ms). */
  cubeTransitionMs: number;
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

export const DRIVE_HERO_FOLDER_URL = "https://drive.google.com/drive/folders/1ZTex8rkKw_DHVOtMcYF0Pn6hnOQBodHC";

// Stable file-ID URLs keep the public hero independent from Drive thumbnails and folder ordering.
// LEGACY FALLBACK: these are only served while the GitHub-managed hero
// library (src/lib/hero-image-library.ts) is empty. Remove once the library
// is populated and verified in production.
export const DRIVE_HERO_IMAGES = [
  "https://lh3.googleusercontent.com/d/1ps_mfXSUn1ZSYlVxJHJT1X4Nhv8-Wz7U=w2000", // Untitled design - 1.webp
  "https://lh3.googleusercontent.com/d/1w3Z6NFDbeaLVSTtzuCRqfb-UTFnBkOn8=w2000", // Untitled design - 2.webp
  "https://lh3.googleusercontent.com/d/1qn-fCE1TcTw5jtf_PVVW6CbCtwhz-GC5=w2000", // Untitled design - 3.webp
  "https://lh3.googleusercontent.com/d/1MIb4eQYMbezI3coF2YU-ZXxOdIxRy9Tu=w2000", // Untitled design - 4.webp
  "https://lh3.googleusercontent.com/d/126w7aAdzX0QUGsssGXgApgG0IkSeTpI-=w2000", // Untitled design - 5.webp
  "https://lh3.googleusercontent.com/d/17IqYlVGbgYYw38-ZaOXLjCtH_jiDfBzT=w2000", // Untitled design - 6.webp
  "https://lh3.googleusercontent.com/d/1hxgQaHKr19HElmYu1vQVe7KDRkzvtHfa=w2000", // Untitled design - 7.webp
  "https://lh3.googleusercontent.com/d/1-3QOpTcZ5IK1oNfbSsC8vTfpifaZREfU=w2000", // Untitled design - 8.webp
  "https://lh3.googleusercontent.com/d/1J2PDB_RaSDlnn-V-7-Pb8veeQk8PU9T-=w2000", // Untitled design - 9.webp
  "https://lh3.googleusercontent.com/d/1CBsDAgcclwv7mxL49NkKk5OrCutFCEcX=w2000", // Untitled design - 10.webp
  "https://lh3.googleusercontent.com/d/1Be5ZAjl0srPDUO2qxldazDijKoKhU4LH=w2000", // Untitled design - 11.webp
  "https://lh3.googleusercontent.com/d/1bMIaoMbcepxoxXg0dzs-LQMqv4S8x5fH=w2000", // Untitled design - 12.webp
  "https://lh3.googleusercontent.com/d/1eHp-U3vdKwNpZyNww4XriqIHATwuA03V=w2000", // Untitled design - 13.webp
  "https://lh3.googleusercontent.com/d/1Swoh3PiB6_R6QQcBkHtfptUBZRTFQyZf=w2000", // Untitled design - 14.webp
  "https://lh3.googleusercontent.com/d/1UEVrt8sd2xXKt2PYMbtSltD6Yku5Pw6o=w2000", // Untitled design - 15.webp
  "https://lh3.googleusercontent.com/d/1rcwrakz4r8ErK4m4BEI1353ZWQj4D8wq=w2000", // Untitled design - 16.webp
  "https://lh3.googleusercontent.com/d/19KNbS9hVoJhLoL1ty2Q3YjLq_lYpD8AZ=w2000", // Untitled design - 17.webp
  "https://lh3.googleusercontent.com/d/1Qazpm2Mu7srXfT1J_5Sm8Ld1a1e0ZUe_=w2000", // Untitled design - 18.webp
  "https://lh3.googleusercontent.com/d/1BzgFIbtUNi1ielz18JGoxSmFJ5Kxn9y6=w2000", // Untitled design - 19.webp
  "https://lh3.googleusercontent.com/d/1gfNyBDTIOB5y37fLp_EacxbVtTPnYfwA=w2000", // Untitled design - 20.webp
  "https://lh3.googleusercontent.com/d/1BtMXCRaiHD3K_OEeTTPlUSwN6D7NizSt=w2000", // Untitled design - 21.webp
  "https://lh3.googleusercontent.com/d/1D7TUGgi0vaCC1V-Gnj200hq348n-zO6l=w2000", // Untitled design - 22.webp
  "https://lh3.googleusercontent.com/d/1J4C5aNeFv_fkQ4doxaFmTehEJiKU6oF1=w2000", // Untitled design - 23.webp
  "https://lh3.googleusercontent.com/d/1kgxu5sCUrnmBRUrEdfx11mvEL1apPBLv=w2000", // Untitled design - 24.webp
  "https://lh3.googleusercontent.com/d/1wW2lTFdoswt-BzN2dMaevzgbbfz4cm8E=w2000", // Untitled design - 25.webp
  "https://lh3.googleusercontent.com/d/17aM9VOdvRDgUNHLerj1B8EUC4prrlYtL=w2000", // Untitled design - 26.webp
  "https://lh3.googleusercontent.com/d/1NGfff5Oo76zBg2mN4EZupWytmGXFUadb=w2000", // Untitled design - 27.webp
  "https://lh3.googleusercontent.com/d/1RgQ_YnpD8FISo-h-LUiEyPvfO7JpE_AW=w2000", // Untitled design - 28.webp
  "https://lh3.googleusercontent.com/d/19nO0hFZ_NpbYFQXfmGTRy6tt8or3FDSi=w2000", // Untitled design - 29.webp
  "https://lh3.googleusercontent.com/d/1jj86B_yYR7k4v2g-RgMnFRDF8GZZTyuQ=w2000", // Untitled design - 30.webp
  "https://lh3.googleusercontent.com/d/1xJsG4U-lljOL_OPwVGl9N3F1GYaoZD3s=w2000", // Untitled design - 31.webp
  "https://lh3.googleusercontent.com/d/15VpFF3O2abNsA2M-1LM1pdTScHYz_yHX=w2000", // Untitled design - 32.webp
  "https://lh3.googleusercontent.com/d/1PiDuFWwxh9x9MK5OX4VbIPscxUjdNddP=w2000", // Untitled design - 33.webp
  "https://lh3.googleusercontent.com/d/1zLZe80EdYu9WFAW4mM49PMhL8FzR3D9B=w2000", // Untitled design - 34.webp
  "https://lh3.googleusercontent.com/d/19qZZoFPzHHFUjdmrxkcz30EnIFJjcXic=w2000", // Untitled design - 35.webp
  "https://lh3.googleusercontent.com/d/1y0a4EO2Ov5cGjt0aKHbjSC2s0RCu7mcm=w2000", // Untitled design - 36.webp
  "https://lh3.googleusercontent.com/d/1ABsm6ZHkgemYm1FRw0glL_Vw-9k4EzTq=w2000", // Untitled design - 37.webp
  "https://lh3.googleusercontent.com/d/1edGHAWA6oJxMLx1ac4uilagqu4OZv5yh=w2000", // Untitled design - 38.webp
  "https://lh3.googleusercontent.com/d/1suYuJYs3oZfUJx_xbww3P_TIaGUJoWF-=w2000", // Untitled design - 39.webp
  "https://lh3.googleusercontent.com/d/1yn0Jv5Mzd2VhRvaThRd1kdX0t4Oy_c78=w2000", // Untitled design - 41.webp
  "https://lh3.googleusercontent.com/d/1iDEfzBZrpfO7qjYDt_Yg2lJ-lScN5qAX=w2000", // Untitled design - 42.webp
  "https://lh3.googleusercontent.com/d/1Y58LxCAbASuc1IUEmrmxVpS-4x4Xv96g=w2000", // Untitled design - 43.webp
  "https://lh3.googleusercontent.com/d/17UDlU8xZEGD8UsGBpJ_Ei9pGc-mOWtan=w2000", // Untitled design - 44.webp
  "https://lh3.googleusercontent.com/d/1rL0pavFTUCjrTBOn9t6xuIo5nCZ9bB8M=w2000", // Untitled design - 45.webp
  "https://lh3.googleusercontent.com/d/1I3aXQKoeiJGo8BqTmpvc6aXzmM19pE4l=w2000", // Untitled design - 46.webp
  "https://lh3.googleusercontent.com/d/1U9QLrh8RHYxITy7QIl9y2pUK0kUBaisK=w2000", // Untitled design - 47.webp
  "https://lh3.googleusercontent.com/d/1fKz_O4UxGPs4kDFwuZRMx94-8FpBa_XQ=w2000", // Untitled design - 48.webp
];

// The GitHub hero library takes precedence as soon as it has entries.
const HERO_LIBRARY_SLIDES = getLibraryHeroSlides();

export const heroConfig: HeroConfig = {
  slides: isHeroLibraryConfigured()
    ? HERO_LIBRARY_SLIDES
    : DRIVE_HERO_IMAGES.map((src, index) => ({
        id: "drive-hero-" + (index + 1),
        type: "image" as const,
        // Google Drive serves the best available rendition up to this requested
        // ceiling; the browser still downscales cleanly for smaller viewports.
        src: src.replace(/=w\d+$/, "=w8192"),
        alt: "RADAR hero image " + (index + 1),
        order: index + 1,
        active: true,
        fit: "cover" as const,
      })),
  // Four-second autoplay with the next image decoded before the cube rotates.
  durationMs: 4000,
  // Outward-rotating cube transition duration (brief: 800-1000ms).
  cubeTransitionMs: 900,
  transition: "fade",
  reducedMotionFallback: "/hero-new/banner-1.webp",
  eyebrow: "(01 / Signal)\nArtist development & culture",
  headline: ["ON", "THE", "RADAR"],
  subheadline: "A music ecosystem for artists, releases, stories, and the people moving culture forward.",
};

export const homepageContent: HomepageContent = {
  ticker: ["NEW OFFICIAL SITE", "AKT!V", "ON THE RADAR"],
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
  cta: { headline: ["Make", "some", "noise."], email: "hello@radarcharts.net" },
};

export function getActiveHeroSlides() {
  return heroConfig.slides.filter((slide) => slide.active).sort((a, b) => a.order - b.order);
}
