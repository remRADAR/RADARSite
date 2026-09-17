export interface TickerItem { id: string; text: string; icon?: string; linkUrl?: string }
export interface AktivBoxItem { id: string; badgeNumber: string; title: string; subtitle: string; linkUrl: string; featuredImage: string; visible: boolean }
export interface SelectedWorkItem { id: string; number: string; yearTag: string; categoryTag: string; artistOrProjectName: string; headline: string; description: string; caseStudyUrl: string; coverImage: string; visible: boolean }
export interface ProcessStepItem { id: string; stepNumber: string; title: string; description?: string; visible: boolean }
export interface SocialProfile { visible: boolean; url: string }
export interface GlobalSiteConfig {
  tickers: { ticker1_audioPlayer: { enabled: boolean; trackTitle: string; playlistStatusText: string; audioStreamUrl: string; autoPlay: boolean }; ticker2_heroMarquee: { enabled: boolean; speedSeconds: number; items: TickerItem[] }; ticker3_partnerMarquee: { enabled: boolean; speedSeconds: number; items: string[] }; ticker4_footerMarquee: { enabled: boolean; speedSeconds: number; text: string; separatorSymbol: string } };
  homepage: { hero: { coordinates: string; line1: string; line2: string; line3: string; subtitle: string; backgroundImages: string[] }; aktivGrid: AktivBoxItem[]; selectedWork: SelectedWorkItem[]; processSteps: ProcessStepItem[]; ctaSection: { headline: string; contactEmail: string; buttonText: string } };
  navigation: { headerLinks: Array<{ label: string; url: string; isExternal?: boolean }>; socialProfiles: Record<"instagram" | "twitter" | "facebook" | "threads" | "linkedin" | "youtube" | "tiktok", SocialProfile> };
}

export const defaultSiteConfig: GlobalSiteConfig = {
  tickers: {
    ticker1_audioPlayer: { enabled: true, trackTitle: "Top10: *Track", playlistStatusText: "PLAYLIST LIVE", audioStreamUrl: "", autoPlay: false },
    ticker2_heroMarquee: { enabled: true, speedSeconds: 26, items: ["MOTHERLAND PROJECT", "LIVE ON ARTIZEN", "SEASON 7"].map((text, i) => ({ id: `hero-ticker-${i + 1}`, text, icon: "✳", linkUrl: "" })) },
    ticker3_partnerMarquee: { enabled: true, speedSeconds: 30, items: ["RADARUnit", "RADARMe", "On The Radar", "RADARArticles", "RADAR Sessions", "RADAR Live"] },
    ticker4_footerMarquee: { enabled: true, speedSeconds: 32, text: "remRADAR", separatorSymbol: "✳" },
  },
  homepage: {
    hero: { coordinates: "14.7167°N / 17.4677°W", line1: "ON", line2: "THE", line3: "RADAR", subtitle: "A music ecosystem for artists, releases, stories, and the people moving culture forward.", backgroundImages: ["/hero-new/banner-1.webp", "/hero-new/banner-3.webp", "/hero-new/banner-4.webp"] },
    aktivGrid: [
      ["01", "ARTICLES", "Editorial Stories", "/ontheradar/articles"], ["02", "MUSIC", "Music #OnTheRADAR", "/radarmusic"], ["03", "MAGAZINE", "Talk To Us Interviews", "/ontheradar/magazine"], ["04", "MOTHERLand", "The Music To Her", "/motherland"],
    ].map(([badgeNumber, title, subtitle, linkUrl], i) => ({ id: `aktiv-${i + 1}`, badgeNumber, title, subtitle, linkUrl, featuredImage: `/hero-new/banner-${(i % 4) + 1}.webp`, visible: true })),
    selectedWork: [
      ["01", "2026", "Artist Development", "Luna Vale", "Giving a debut artist a world before the first record arrived", "Artist identity, visual language, and a release campaign for a voice built for the night.", "/work/luna-vale-first-light", "/hero-new/banner-1.webp"],
      ["02", "2025", "Editorial, Platform, Live", "RADAR Sessions", "Turning a playlist into a place people want to return to", "An editorial platform and live session series for the next wave of independent sound.", "/work/after-hours-vol-02", "/hero-new/banner-3.webp"],
      ["03", "2025", "Release Strategy", "Kofi North", "Building a release campaign that travels beyond the feed", "A tactile campaign system for an album about distance, home, and finding the signal again.", "/work/north-star-release", "/hero-new/banner-4.webp"],
    ].map(([number, yearTag, categoryTag, artistOrProjectName, headline, description, caseStudyUrl, coverImage], i) => ({ id: `work-${i + 1}`, number, yearTag, categoryTag, artistOrProjectName, headline, description, caseStudyUrl, coverImage, visible: true })),
    processSteps: ["Listen", "Frame", "Make", "Move"].map((title, i) => ({ id: `step-${i + 1}`, stepNumber: String(i + 1).padStart(2, "0"), title, description: "A considered step in the process.", visible: true })),
    ctaSection: { headline: "Make some noise.", contactEmail: "hello@radarcharts.com", buttonText: "Start a conversation" },
  },
  navigation: { headerLinks: [{ label: "RADARMe", url: "https://radarme.app", isExternal: true }], socialProfiles: { instagram: { visible: true, url: "https://www.instagram.com/remradar/" }, twitter: { visible: true, url: "https://x.com/RADARCharts" }, facebook: { visible: true, url: "https://www.facebook.com/radarcharts/" }, threads: { visible: true, url: "https://www.threads.com/@remradar" }, linkedin: { visible: true, url: "https://www.linkedin.com/company/radarcharts/" }, youtube: { visible: true, url: "https://www.youtube.com/@remradar" }, tiktok: { visible: true, url: "https://www.tiktok.com/@radarcharts" } } },
};

export function normalizeSiteConfig(input: unknown): GlobalSiteConfig {
  if (!input || typeof input !== "object") return defaultSiteConfig;
  const value = input as Partial<GlobalSiteConfig>;
  return { ...defaultSiteConfig, ...value, tickers: { ...defaultSiteConfig.tickers, ...(value.tickers || {}) }, homepage: { ...defaultSiteConfig.homepage, ...(value.homepage || {}) }, navigation: { ...defaultSiteConfig.navigation, ...(value.navigation || {}) } };
}

export const SITE_CONFIG_KEY = "radar-global-site-config";
