export const SITE_OVERRIDES_KEY = "radarcharts-site-overrides";

export type SocialLink = { label: string; href: string; enabled: boolean };
export type MotherlandBanner = { text: string; link: string; startDate: string; endDate: string; visible: boolean };
export type EcosystemNavItem = { label: string; slug: string; icon?: string; order: number; visible: boolean };
export type HomepageCaseStudy = { artistName: string; category: string; year: string; headline: string; description: string; image: string; ctaLabel: string; destination: string; visible: boolean; order: number };
export type ProcessStep = { stepNumber: string; title: string; description?: string; visible: boolean };
export type Testimonial = { quote: string; attribution: string; artistLink?: string; visible: boolean; priority: number };
export type FooterNavItem = { label: string; url: string; newTab: boolean; visible: boolean; group: "Product" | "Content" | "Company" };
export type HomepageVideo = { videoId: string; title: string; caption: string; lazyLoad: boolean; visible: boolean };
export type YoutubeFeed = { enabled: boolean; channelId: string; maxItems: number; filterKeywords: string[] };
export type ContactCTA = { headline: string[]; subhead: string; email: string; alternateLink?: string; visible: boolean };

export type SiteOverrides = {
  media: Record<string, string>;
  logoText: string;
  logoImage: string;
  tickerIcon: string;
  tickerIconImage: string;
  heroHeadline: string[];
  heroSubheadline: string;
  tickerItems: string[];
  featuredSlugs: string[];
  seoTitle: string;
  seoDescription: string;
  socialImage: string;
  canonicalOverride: string;
  socialLinks: SocialLink[];
  radarMeUrl: string;
  playlistId: string;
  playlistLabel: string;
  playlistEnabled: boolean;
  geoSignature: string;
  motherlandBanner: MotherlandBanner[];
  ecosystemNav: EcosystemNavItem[];
  caseStudies: HomepageCaseStudy[];
  processSteps: ProcessStep[];
  testimonials: Testimonial[];
  footerNav: FooterNavItem[];
  homepageVideo: HomepageVideo;
  youtubeFeed: YoutubeFeed;
  contactCTA: ContactCTA;
};

const defaultMotherlandBanner: MotherlandBanner[] = [{ text: "MOTHERLAND PROJECT", link: "/ontheradar/projects", startDate: "", endDate: "", visible: true }];
const defaultEcosystemNav: EcosystemNavItem[] = [
  { label: "ARTICLES", slug: "/ontheradar/articles", order: 1, visible: true },
  { label: "MUSIC", slug: "/radarmusic", order: 2, visible: true },
  { label: "MAGAZINE", slug: "/ontheradar/magazine", order: 3, visible: true },
  { label: "MOTHERLand", slug: "/ontheradar/projects", order: 4, visible: true },
];

export const defaultSiteOverrides: SiteOverrides = {
  media: {}, logoText: "remRADAR", logoImage: "/radar-logo.webp", tickerIcon: "✨", tickerIconImage: "/radar-n-logo.png", heroHeadline: [], heroSubheadline: "", tickerItems: [], featuredSlugs: [],
  seoTitle: "RADARCharts — Put it on the RADAR", seoDescription: "RADARCharts is a Nigerian and African music discovery, media, culture, artist-development, and intelligence platform.", socialImage: "", canonicalOverride: "",
  socialLinks: [
    { label: "Instagram", href: "https://www.instagram.com/remradar/", enabled: true }, { label: "X", href: "https://x.com/RADARCharts", enabled: true }, { label: "Facebook", href: "https://www.facebook.com/radarcharts/", enabled: true }, { label: "Threads", href: "https://www.threads.com/@remradar", enabled: true }, { label: "LinkedIn", href: "https://www.linkedin.com/company/radarcharts/", enabled: true }, { label: "YouTube", href: "https://www.youtube.com/@remradar", enabled: true }, { label: "TikTok", href: "https://www.tiktok.com/@radarcharts", enabled: true },
  ], radarMeUrl: "https://radarme.app", playlistId: "PLZ_5O41VO5Mk", playlistLabel: "Top10: *Track", playlistEnabled: true,
  geoSignature: "14.7167°N / 17.4677°W", motherlandBanner: defaultMotherlandBanner, ecosystemNav: defaultEcosystemNav, caseStudies: [], processSteps: [], testimonials: [], footerNav: [],
  homepageVideo: { videoId: "", title: "RADARCharts homepage video", caption: "", lazyLoad: true, visible: false }, youtubeFeed: { enabled: false, channelId: "", maxItems: 6, filterKeywords: [] }, contactCTA: { headline: ["Make", "some", "noise."], subhead: "", email: "hello@radarcharts.com", visible: true },
};

function text(value: unknown, fallback: string, max = 2000) { return typeof value === "string" ? value.trim().slice(0, max) : fallback; }
function strings(value: unknown, fallback: string[]) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 2000)).filter(Boolean).slice(0, 100) : fallback; }
function url(value: unknown, fallback: string) { const candidate = text(value, fallback); if (!candidate) return ""; if (candidate.startsWith("/")) return candidate; try { const parsed = new URL(candidate); return parsed.protocol === "http:" || parsed.protocol === "https:" ? candidate : fallback; } catch { return fallback; } }
function socialLinks(value: unknown) { return Array.isArray(value) ? value.slice(0, 20).flatMap((item) => { if (!item || typeof item !== "object") return []; const link = item as Partial<SocialLink>; const href = url(link.href, ""); const label = text(link.label, ""); return href && label ? [{ label, href, enabled: link.enabled !== false }] : []; }) : defaultSiteOverrides.socialLinks; }
function banners(value: unknown) { return Array.isArray(value) ? value.slice(0, 20).flatMap((item) => { if (!item || typeof item !== "object") return []; const v = item as Partial<MotherlandBanner>; const textValue = text(v.text, ""); return textValue ? [{ text: textValue, link: url(v.link, "#"), startDate: text(v.startDate, "", 40), endDate: text(v.endDate, "", 40), visible: v.visible !== false }] : []; }) : defaultMotherlandBanner; }
function navItems(value: unknown) { return Array.isArray(value) ? value.slice(0, 6).flatMap((item, index) => { if (!item || typeof item !== "object") return []; const v = item as Partial<EcosystemNavItem>; const label = text(v.label, ""); return label ? [{ label, slug: url(v.slug, "/"), icon: text(v.icon, "", 20), order: Number(v.order) || index + 1, visible: v.visible !== false }] : []; }) : defaultEcosystemNav; }
function processSteps(value: unknown) { return Array.isArray(value) ? value.slice(0, 6).flatMap((item, index) => { if (!item || typeof item !== "object") return []; const v = item as Partial<ProcessStep>; const title = text(v.title, ""); return title ? [{ stepNumber: text(v.stepNumber, String(index + 1), 20), title, description: text(v.description, ""), visible: v.visible !== false }] : []; }) : []; }
function testimonials(value: unknown) { return Array.isArray(value) ? value.slice(0, 20).flatMap((item, index) => { if (!item || typeof item !== "object") return []; const v = item as Partial<Testimonial>; const quote = text(v.quote, ""); return quote ? [{ quote, attribution: text(v.attribution, ""), artistLink: url(v.artistLink, ""), visible: v.visible !== false, priority: Number(v.priority) || index + 1 }] : []; }) : []; }

export function normalizeSiteOverrides(input: unknown): SiteOverrides {
  const value = input && typeof input === "object" ? input as Partial<SiteOverrides> : {};
  const media: Record<string, string> = {};
  if (value.media && typeof value.media === "object" && !Array.isArray(value.media)) for (const [key, item] of Object.entries(value.media).slice(0, 100)) { const clean = url(item, ""); if (clean) media[key.trim().slice(0, 120)] = clean; }
  const cta = value.contactCTA && typeof value.contactCTA === "object" ? value.contactCTA as Partial<ContactCTA> : {};
  const video = value.homepageVideo && typeof value.homepageVideo === "object" ? value.homepageVideo as Partial<HomepageVideo> : {};
  const feed = value.youtubeFeed && typeof value.youtubeFeed === "object" ? value.youtubeFeed as Partial<YoutubeFeed> : {};
  return {
    ...defaultSiteOverrides, media, logoText: text(value.logoText, defaultSiteOverrides.logoText), logoImage: url(value.logoImage, defaultSiteOverrides.logoImage), tickerIcon: text(value.tickerIcon, defaultSiteOverrides.tickerIcon), tickerIconImage: url(value.tickerIconImage, defaultSiteOverrides.tickerIconImage), heroHeadline: strings(value.heroHeadline, defaultSiteOverrides.heroHeadline), heroSubheadline: text(value.heroSubheadline, defaultSiteOverrides.heroSubheadline), tickerItems: strings(value.tickerItems, defaultSiteOverrides.tickerItems), featuredSlugs: strings(value.featuredSlugs, defaultSiteOverrides.featuredSlugs), seoTitle: text(value.seoTitle, defaultSiteOverrides.seoTitle, 60), seoDescription: text(value.seoDescription, defaultSiteOverrides.seoDescription, 160), socialImage: url(value.socialImage, defaultSiteOverrides.socialImage), canonicalOverride: url(value.canonicalOverride, defaultSiteOverrides.canonicalOverride), socialLinks: socialLinks(value.socialLinks), radarMeUrl: url(value.radarMeUrl, defaultSiteOverrides.radarMeUrl), playlistId: text(value.playlistId, defaultSiteOverrides.playlistId, 200), playlistLabel: text(value.playlistLabel, defaultSiteOverrides.playlistLabel), playlistEnabled: value.playlistEnabled !== false,
    geoSignature: text(value.geoSignature, defaultSiteOverrides.geoSignature, 100), motherlandBanner: banners(value.motherlandBanner), ecosystemNav: navItems(value.ecosystemNav), caseStudies: Array.isArray(value.caseStudies) ? value.caseStudies.slice(0, 50) as HomepageCaseStudy[] : [], processSteps: processSteps(value.processSteps), testimonials: testimonials(value.testimonials), footerNav: Array.isArray(value.footerNav) ? value.footerNav.slice(0, 50) as FooterNavItem[] : [], homepageVideo: { videoId: text(video.videoId, "", 100), title: text(video.title, defaultSiteOverrides.homepageVideo.title), caption: text(video.caption, ""), lazyLoad: video.lazyLoad !== false, visible: video.visible === true }, youtubeFeed: { enabled: feed.enabled === true, channelId: text(feed.channelId, "", 200), maxItems: Math.min(20, Math.max(1, Number(feed.maxItems) || 6)), filterKeywords: strings(feed.filterKeywords, []) }, contactCTA: { headline: strings(cta.headline, defaultSiteOverrides.contactCTA.headline), subhead: text(cta.subhead, ""), email: text(cta.email, defaultSiteOverrides.contactCTA.email, 200), alternateLink: url(cta.alternateLink, ""), visible: cta.visible !== false },
  };
}

export function readSiteOverrides(): SiteOverrides { if (typeof window === "undefined") return defaultSiteOverrides; try { return normalizeSiteOverrides(JSON.parse(window.localStorage.getItem(SITE_OVERRIDES_KEY) || "null")); } catch { return defaultSiteOverrides; } }
export function subscribeToSiteOverrides(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener("radar-overrides-updated", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("radar-overrides-updated", callback); }; }
export function getSiteOverridesSnapshot() { return JSON.stringify(readSiteOverrides()); }
export function getSiteOverridesServerSnapshot() { return JSON.stringify(defaultSiteOverrides); }
export function parseSiteOverrides(snapshot: string): SiteOverrides { try { return normalizeSiteOverrides(JSON.parse(snapshot)); } catch { return defaultSiteOverrides; } }
