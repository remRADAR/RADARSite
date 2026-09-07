export const RADARME_URL = "https://radarme.app";

type Related = { artists?: string[]; releases?: string[]; articles?: string[]; magazine?: string[]; projects?: string[]; events?: string[] };
type EditorialFields = { imageUrl?: string; featuredImage?: string; categories?: string[]; metaTitle?: string; metaDescription?: string };
export type Artist = EditorialFields & { slug: string; name: string; project: string; bio: string; imageQuery: string; related: Related };
export type Release = EditorialFields & { slug: string; title: string; artist: string; date: string; description: string; imageQuery: string; related: Related };
export type Article = EditorialFields & { slug: string; title: string; date: string; tags: string[]; body: string; imageQuery: string; related: Related };
export type MagazineStory = EditorialFields & { slug: string; title: string; subtitle: string; year: string; body: string; imageQuery: string; related: Related };
export type RadarProject = EditorialFields & { slug: string; title: string; category: string; year: string; brief: string; imageQuery: string; related: Related };
export type Event = EditorialFields & { slug: string; title: string; date: string; location: string; description: string; imageQuery: string; related: Related };

export const artists: Artist[] = [
  { slug: "luna-vale", name: "Luna Vale", project: "First Light", bio: "A midnight voice building a world out of soft focus, hard flash, and songs that stay after the room goes quiet.", imageQuery: "female singer red stage light live music", related: { releases: ["first-light"], magazine: ["luna-vale-after-midnight"], projects: ["first-light-world"], events: ["radar-live-london"] } },
  { slug: "kofi-north", name: "Kofi North", project: "North Star", bio: "A songwriter mapping distance, memory, and the spaces between one city and the next.", imageQuery: "male musician portrait dramatic studio light", related: { releases: ["north-star"], articles: ["north-star-release-note"], projects: ["north-star-world"], events: ["radar-live-accra"] } },
];

export const releases: Release[] = [
  { slug: "first-light", title: "First Light", artist: "Luna Vale", date: "2026-10-12", description: "A four-track debut about the hour after midnight and the courage to be heard.", imageQuery: "abstract red texture album cover", related: { artists: ["luna-vale"], magazine: ["luna-vale-after-midnight"], projects: ["first-light-world"] } },
  { slug: "north-star", title: "North Star", artist: "Kofi North", date: "2026-06-20", description: "An album about movement, home, and finding the signal again.", imageQuery: "vinyl record album cover moody", related: { artists: ["kofi-north"], articles: ["north-star-release-note"], projects: ["north-star-world"] } },
];

export const articles: Article[] = [
  { slug: "north-star-release-note", title: "Kofi North finds the signal again", date: "2026-06-20", tags: ["Release", "Artist"], body: "North Star is a record about movement without losing the thread back home. We talk to Kofi North about making an album that leaves the door open.", imageQuery: "music studio analog equipment moody", related: { artists: ["kofi-north"], releases: ["north-star"], projects: ["north-star-world"] } },
  { slug: "radar-sessions-season-two", title: "RADAR Sessions returns after hours", date: "2026-08-04", tags: ["RADAR Sessions", "News"], body: "Twelve new sessions, recorded close and left human. Season two is now live across the RADAR ecosystem.", imageQuery: "band live performance blue stage", related: { artists: ["luna-vale"], events: ["radar-live-london"] } },
];

export const magazine: MagazineStory[] = [
  { slug: "luna-vale-after-midnight", title: "Luna Vale after midnight", subtitle: "A conversation about the silence before a first record speaks.", year: "2026", body: "Luna Vale has learned to let the quiet do some of the work. In a long-form conversation, she tells us about first takes, borrowed rooms, and making a debut that does not ask permission.", imageQuery: "artist portrait black and white flash", related: { artists: ["luna-vale"], releases: ["first-light"], projects: ["first-light-world"] } },
  { slug: "rooms-that-remember", title: "Rooms that remember", subtitle: "Why the best sessions still sound like a place.", year: "2025", body: "From the first cable check to the last light out, the rooms around music leave a fingerprint. We visit the spaces shaping the next RADAR generation.", imageQuery: "recording studio blue neon musician", related: { artists: ["kofi-north"], articles: ["radar-sessions-season-two"], events: ["radar-live-london"] } },
];

export const radarProjects: RadarProject[] = [
  { slug: "first-light-world", title: "Luna Vale — First Light", category: "Artist development", year: "2026", brief: "A complete debut world spanning identity, live session, cover system, and release campaign.", imageQuery: "singer microphone red spotlight concert", related: { artists: ["luna-vale"], releases: ["first-light"], magazine: ["luna-vale-after-midnight"] } },
  { slug: "north-star-world", title: "Kofi North — North Star", category: "Release campaign", year: "2026", brief: "A tactile album campaign across physical editions, outdoor signal, and intimate listening rooms.", imageQuery: "music billboard city night", related: { artists: ["kofi-north"], releases: ["north-star"], articles: ["north-star-release-note"] } },
];

export const events: Event[] = [
  { slug: "radar-live-london", title: "RADAR Live: London", date: "2026-10-24", location: "Village Underground, London", description: "A night of new signals from Luna Vale, Kofi North, and friends of the ecosystem.", imageQuery: "intimate concert venue audience", related: { artists: ["luna-vale", "kofi-north"], releases: ["first-light"] } },
  { slug: "radar-live-accra", title: "RADAR Live: Accra", date: "2026-11-14", location: "Untitled, Accra", description: "North Star arrives home for a listening room, live set, and conversation.", imageQuery: "concert audience silhouette blue", related: { artists: ["kofi-north"], releases: ["north-star"] } },
];

export const findBySlug = <T extends { slug: string }>(items: T[], slug: string) => items.find((item) => item.slug === slug);
