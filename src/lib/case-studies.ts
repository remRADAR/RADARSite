export type MediaTone = "warm" | "cool" | "mono" | "flare";
export type ApproachStep = { label: string; description: string };
export type GalleryItem = { tone: MediaTone; span: "full" | "half" | "third"; caption: string; imageQuery: string };
export type ResultStat = { value: string; label: string };

export type CaseStudy = {
  slug: string;
  client: string;
  title: string;
  oneLiner: string;
  role: string;
  year: string;
  scope: string;
  deliverables: string;
  heroTone: MediaTone;
  heroImageQuery: string;
  breakImageQuery: string;
  brief: string;
  approach: ApproachStep[];
  gallery: GalleryItem[];
  hasVideoMoment: boolean;
  results: ResultStat[];
  credits: { role: string; name: string }[];
  featured: boolean;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "luna-vale-first-light",
    client: "Luna Vale",
    title: "Giving a debut artist a world before the first record arrived",
    oneLiner: "Artist identity, visual language, and a release campaign for a voice built for the night.",
    role: "Artist Development, Campaign, Film",
    year: "2026",
    scope: "Artist identity, debut EP, campaign system",
    deliverables: "Visual identity, 4-track world, live session, release campaign",
    heroTone: "flare",
    heroImageQuery: "female singer red stage light live music",
    breakImageQuery: "musician backstage portrait red light",
    brief: "Luna Vale had the songs, the voice, and a visual instinct that was impossible to fake. RADAR's job was to build a coherent first chapter without sanding off the mystery that made people lean in.",
    approach: [
      { label: "Listen", description: "A deep dive into demos, references, live footage, and the emotional logic behind the EP." },
      { label: "Frame", description: "A visual system built around contrast: soft focus, hard flash, and the hour after midnight." },
      { label: "Make", description: "Portraits, a live session, cover art, and a modular release toolkit for every platform." },
      { label: "Move", description: "A release campaign that made the artist feel present before the algorithm caught up." },
    ],
    gallery: [
      { tone: "flare", span: "full", caption: "First light, first take", imageQuery: "singer microphone red spotlight concert" },
      { tone: "warm", span: "half", caption: "The room before the room", imageQuery: "music studio analog equipment moody" },
      { tone: "mono", span: "half", caption: "Portrait study 01", imageQuery: "artist portrait black and white flash" },
      { tone: "flare", span: "third", caption: "Cover world", imageQuery: "abstract red texture album cover" },
      { tone: "warm", span: "third", caption: "After the show", imageQuery: "backstage concert photography" },
      { tone: "mono", span: "third", caption: "Track notes", imageQuery: "vinyl record music desk" },
    ],
    hasVideoMoment: true,
    results: [
      { value: "4.8M", label: "Streams in the first release cycle" },
      { value: "32", label: "Editorial placements and playlists" },
      { value: "01", label: "Debut world, fully formed" },
    ],
    credits: [
      { role: "Artist", name: "Luna Vale" },
      { role: "Creative Direction", name: "RADARCharts" },
      { role: "Visuals", name: "RADARUnit" },
      { role: "Management", name: "RADARMe" },
    ],
    featured: true,
  },
  {
    slug: "after-hours-vol-02",
    client: "RADAR Sessions",
    title: "Turning a playlist into a place people want to return to",
    oneLiner: "An editorial platform and live session series for the next wave of independent sound.",
    role: "Editorial, Platform, Live",
    year: "2025",
    scope: "Series identity, editorial platform, live sessions",
    deliverables: "Series identity, digital hub, 12 artist sessions, editorial package",
    heroTone: "cool",
    heroImageQuery: "dj club blue light crowd music",
    breakImageQuery: "recording studio blue neon musician",
    brief: "After Hours needed to feel less like a playlist and more like a trusted room: a place where discovery has a point of view and every artist gets enough space to be remembered.",
    approach: [
      { label: "Curate", description: "A point of view grounded in people, not genre labels or release velocity." },
      { label: "Build", description: "A flexible identity that could live on screen, in print, and across a live room." },
      { label: "Record", description: "Twelve stripped-back sessions that kept the imperfections in the signal." },
      { label: "Publish", description: "Editorial context around every track, artist, and late-night discovery." },
    ],
    gallery: [
      { tone: "cool", span: "full", caption: "Session 02, live", imageQuery: "band live performance blue stage" },
      { tone: "mono", span: "half", caption: "Signal check", imageQuery: "mixing console studio close up" },
      { tone: "cool", span: "half", caption: "Room tone", imageQuery: "concert audience silhouette blue" },
      { tone: "mono", span: "third", caption: "The issue", imageQuery: "music magazine editorial print" },
      { tone: "cool", span: "third", caption: "Between tracks", imageQuery: "headphones turntable dark room" },
      { tone: "mono", span: "third", caption: "Live archive", imageQuery: "microphone stage black and white" },
    ],
    hasVideoMoment: true,
    results: [
      { value: "12", label: "Original sessions published" },
      { value: "680k", label: "Returning listeners" },
      { value: "9", label: "Cities in the live series" },
    ],
    credits: [
      { role: "Platform", name: "RADARCharts" },
      { role: "Editorial", name: "RADARArticles" },
      { role: "Production", name: "RADARUnit" },
    ],
    featured: true,
  },
  {
    slug: "north-star-release",
    client: "Kofi North",
    title: "Building a release campaign that travels beyond the feed",
    oneLiner: "A tactile campaign system for an album about distance, home, and finding the signal again.",
    role: "Release Strategy, Design, Campaign",
    year: "2025",
    scope: "Album campaign, physical edition, outdoor takeover",
    deliverables: "Campaign identity, limited edition, OOH system, launch film",
    heroTone: "mono",
    heroImageQuery: "male musician portrait dramatic studio light",
    breakImageQuery: "city night billboard music campaign",
    brief: "Kofi North's album was about movement and memory. We translated that feeling into a campaign that could be held, seen from a passing train, or discovered in a dark corner of the internet.",
    approach: [
      { label: "Map", description: "A release narrative connecting every song to a place, a texture, and a memory." },
      { label: "Shape", description: "A graphic language of coordinates, crop marks, and imperfect human marks." },
      { label: "Print", description: "A limited physical edition designed as an artifact, not merchandise." },
      { label: "Launch", description: "A city-wide signal across outdoor, editorial, and intimate listening rooms." },
    ],
    gallery: [
      { tone: "mono", span: "full", caption: "North Star, city edition", imageQuery: "music billboard city night" },
      { tone: "warm", span: "half", caption: "Archive sleeve", imageQuery: "vinyl album packaging design" },
      { tone: "mono", span: "half", caption: "Coordinates", imageQuery: "map typography poster design" },
      { tone: "warm", span: "third", caption: "Listening room", imageQuery: "intimate concert venue audience" },
      { tone: "mono", span: "third", caption: "Pressed copy", imageQuery: "vinyl record close up warm light" },
      { tone: "warm", span: "third", caption: "Night route", imageQuery: "train window city night" },
    ],
    hasVideoMoment: false,
    results: [
      { value: "2.1M", label: "Campaign reach across launch week" },
      { value: "14", label: "Independent stores activated" },
      { value: "100%", label: "Limited edition sold through" },
    ],
    credits: [
      { role: "Artist", name: "Kofi North" },
      { role: "Campaign", name: "RADARCharts" },
      { role: "Editorial Feature", name: "On The Radar" },
    ],
    featured: false,
  },
];

export function getCaseStudy(slug: string) { return caseStudies.find((c) => c.slug === slug); }
export function getAdjacentCaseStudy(slug: string) {
  const index = caseStudies.findIndex((c) => c.slug === slug);
  return caseStudies[(index + 1) % caseStudies.length] ?? caseStudies[0];
}
