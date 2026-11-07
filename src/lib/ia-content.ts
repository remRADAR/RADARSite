export const RADARME_URL = "https://radarme.app";

type Related = { artists?: string[]; releases?: string[]; articles?: string[]; magazine?: string[]; projects?: string[]; events?: string[] };
type EditorialFields = { imageUrl?: string; featuredImage?: string; categories?: string[]; metaTitle?: string; metaDescription?: string };
export type Artist = EditorialFields & { slug: string; name: string; project: string; bio: string; imageQuery: string; related: Related };
export type Release = EditorialFields & { slug: string; title: string; artist: string; date: string; description: string; imageQuery: string; related: Related };
export type Article = EditorialFields & { slug: string; title: string; date: string; tags: string[]; body: string; imageQuery: string; related: Related };
export type MagazineStory = EditorialFields & { slug: string; title: string; subtitle: string; year: string; body: string; imageQuery: string; related: Related };
export type RadarProject = EditorialFields & { slug: string; title: string; category: string; year: string; brief: string; imageQuery: string; related: Related };
export type Event = EditorialFields & { slug: string; title: string; date: string; location: string; description: string; imageQuery: string; related: Related };

// These arrays were originally seeded with template entities (fictional
// artists, releases, articles, projects and events illustrated with stock
// photography) so the RADARMusic and ON THE RADAR pages had something to
// render before CMS wiring landed. They are deliberately emptied: the index
// pages now render their honest empty states and the detail routes 404 until
// real entries arrive from the CMS. The type shapes and helpers stay
// exported — CMS-backed routes (src/lib/content-server.ts) and the admin
// studio depend on them, and findBySlug is reused by CMS-driven detail pages.
// Do not re-add placeholder or fabricated entities here; the CMS wiring plan
// is documented in HANDOFF.md.
export const artists: Artist[] = [];

export const releases: Release[] = [];

export const articles: Article[] = [];

export const magazine: MagazineStory[] = [];

export const radarProjects: RadarProject[] = [];

export const events: Event[] = [];

export const findBySlug = <T extends { slug: string }>(items: T[], slug: string) => items.find((item) => item.slug === slug);
