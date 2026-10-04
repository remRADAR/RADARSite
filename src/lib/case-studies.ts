export type MediaTone = "warm" | "cool" | "mono" | "flare";
export type ApproachStep = { label: string; description: string };
export type GalleryItem = { tone: MediaTone; span: "full" | "half" | "third"; caption: string; imageQuery: string; imageUrl?: string };
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
  heroImageUrl?: string;
  breakImageQuery: string;
  breakImageUrl?: string;
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
    slug: "mamuzo-dark-era-peak-release",
    client: "Mamuzo / RADARArtists",
    title: "Mamuzo Enters His DARK ERA",
    oneLiner: "An eight-track album bringing together Afro-rooted sounds, collaboration, and a new creative direction.",
    role: "RADARArtists, Peak Release",
    year: "2026",
    scope: "DARK ERA album, eight tracks, 19:25 runtime",
    deliverables: "Album feature, release story, listening guide, artist credits",
    heroTone: "flare",
    heroImageQuery: "Nigerian musician dark album artwork",
    heroImageUrl: "/mamuzo-dark-era.jpg",
    breakImageQuery: "Nigerian artist studio portrait dark light",
    breakImageUrl: "/mamuzo-dark-era.jpg",
    brief: "Mamuzo steps into a new chapter with DARK ERA, an eight-track album that brings together Afrosounds, street-rooted energy and a wide network of collaborators. Released through RADARMusic / PHD Services, the 19-minute project moves through Fl3X, Supreme, Femini$T, Burtifly, Para, Guap Cha$Er, Pasta and Datiemo — presenting an artist still expanding the boundaries of his sound.",
    approach: [
      { label: "The Signal", description: "DARK ERA marks Mamuzo’s movement from a run of individual singles and collaborations into a more defined album-era identity." },
      { label: "The Sound", description: "Eight compact tracks move between confidence, ambition, street energy and experimentation, with Mamuzo at the centre of a broad collaborator circle." },
      { label: "The World", description: "The title, official artwork and range of featured voices establish the first visual and cultural coordinates of this new chapter." },
      { label: "The Peak", description: "Rather than overstate commercial success, DARK ERA is a credible marker of where Mamuzo’s sound stands now — and where it can go next." },
    ],
    gallery: [
      { tone: "flare", span: "full", caption: "DARK ERA — official artwork", imageQuery: "Nigerian musician dark album artwork", imageUrl: "/mamuzo-dark-era.jpg" },
      { tone: "warm", span: "half", caption: "The album world", imageQuery: "Nigerian artist studio portrait dark light" },
      { tone: "mono", span: "half", caption: "Eight tracks, one chapter", imageQuery: "music studio producer mixing console" },
      { tone: "flare", span: "third", caption: "Pasta — first listen", imageQuery: "Afro street musician performance" },
      { tone: "warm", span: "third", caption: "Burtifly — collaborator energy", imageQuery: "African musicians recording studio" },
      { tone: "mono", span: "third", caption: "The next frequency", imageQuery: "Nigerian musician live performance" },
    ],
    hasVideoMoment: true,
    results: [
      { value: "08", label: "Tracks on DARK ERA" },
      { value: "19:25", label: "Minutes of music" },
      { value: "01", label: "New album era" },
    ],
    credits: [
      { role: "Artist", name: "Mamuzo / Diamond Henry Mamuzo" },
      { role: "Label / Distributor", name: "RADARMusic / PHD Services" },
      { role: "Producers", name: "Jimzsounds, Duke Blaq, Harold Courage Teah, colourmixn, Jerrywine, Zen Univrse" },
      { role: "Featured Artists", name: "Dela cream, Zen Univrse, 14H, scottyolorin, Blaqdee" },
      { role: "Management", name: "DNNL" },
      { role: "Editorial", name: "RADARCharts by REM / RADARArtists" },
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
