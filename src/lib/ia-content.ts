export const RADARME_URL = "https://radarme.app";

type Related = { artists?: string[]; releases?: string[]; articles?: string[]; magazine?: string[]; events?: string[] };
type EditorialFields = { imageUrl?: string; featuredImage?: string; categories?: string[]; metaTitle?: string; metaDescription?: string };
export type Artist = EditorialFields & { slug: string; name: string; project: string; bio: string; imageQuery: string; related: Related };
export type Release = EditorialFields & { slug: string; title: string; artist: string; date: string; description: string; imageQuery: string; related: Related };
export type Article = EditorialFields & { slug: string; title: string; date: string; tags: string[]; body: string; imageQuery: string; related: Related };
export type MagazineStory = EditorialFields & { slug: string; title: string; subtitle: string; year: string; body: string; imageQuery: string; related: Related };
export type Event = EditorialFields & { slug: string; title: string; date: string; location: string; description: string; imageQuery: string; related: Related };

export const artists: Artist[] = [
  { slug: "luna-vale", name: "Luna Vale", project: "First Light", bio: "A midnight voice building a world out of soft focus, hard flash, and songs that stay after the room goes quiet.", imageQuery: "female singer red stage light live music", related: { releases: ["first-light"], events: ["radar-live-london"] } },
  { slug: "kofi-north", name: "Kofi North", project: "North Star", bio: "A songwriter mapping distance, memory, and the spaces between one city and the next.", imageQuery: "male musician portrait dramatic studio light", related: { releases: ["north-star"], articles: ["north-star-release-note"], events: ["radar-live-accra"] } },
];

export const releases: Release[] = [
  { slug: "first-light", title: "First Light", artist: "Luna Vale", date: "2026-10-12", description: "A four-track debut about the hour after midnight and the courage to be heard.", imageQuery: "abstract red texture album cover", related: { artists: ["luna-vale"] } },
  { slug: "north-star", title: "North Star", artist: "Kofi North", date: "2026-06-20", description: "An album about movement, home, and finding the signal again.", imageQuery: "vinyl record album cover moody", related: { artists: ["kofi-north"], articles: ["north-star-release-note"] } },
];

export const articles: Article[] = [
  { slug: "north-star-release-note", title: "Kofi North finds the signal again", date: "2026-06-20", tags: ["Release", "Artist"], categories: ["Motherland"], body: "North Star is a record about movement without losing the thread back home. We talk to Kofi North about making an album that leaves the door open.", imageQuery: "music studio analog equipment moody", related: { artists: ["kofi-north"], releases: ["north-star"] } },
  { slug: "radar-sessions-season-two", title: "RADAR Sessions returns after hours", date: "2026-08-04", tags: ["RADAR Sessions", "News"], categories: ["Motherland"], body: "Twelve new sessions, recorded close and left human. Season two is now live across the RADAR ecosystem.", imageQuery: "band live performance blue stage", related: { artists: ["luna-vale"], events: ["radar-live-london"] } },
];

export const magazine: MagazineStory[] = [];

export const events: Event[] = [
  { slug: "omaji-verse-2", title: "OMAJIVERSE", date: "2026-12-10", location: "Liquid Café / City Park Wuse, Abuja", description: "The annual end of year clarion call by Abuja’s renowned artist, OMAJI.", imageQuery: "OMAJI VERSE 2.0 event poster Abuja", imageUrl: "/events/omaji-verse-2-poster.png", featuredImage: "/events/omaji-verse-2-poster.png", metaTitle: "OMAJIVERSE", metaDescription: "OMAJI VERSE 2.0 — the annual end of year clarion call by Abuja’s renowned artist, OMAJI.", related: {} },
];

export const findBySlug = <T extends { slug: string }>(items: T[], slug: string) => items.find((item) => item.slug === slug);
