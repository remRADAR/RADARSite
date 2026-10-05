export type MediaTone = "warm" | "cool" | "mono" | "flare";
export type ApproachStep = { label: string; description: string };
export type GalleryItem = { tone: MediaTone; span: "full" | "half" | "third"; caption: string; imageQuery: string; imageUrl?: string };
export type ResultStat = { value: string; label: string };

export type CaseStudy = {
  slug: string;
  destinationUrl?: string;
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
  videoUrl?: string;
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
    heroImageQuery: "Nigerian musician live performance purple light",
    heroImageUrl: "/mamuzo/img_3953.jpg",
    breakImageQuery: "Nigerian artist studio portrait dark light",
    breakImageUrl: "/mamuzo/img_3966.jpg",
    brief: "Mamuzo steps into a new chapter with DARK ERA, an eight-track album that brings together Afrosounds, street-rooted energy and a wide network of collaborators. Released through RADARMusic / PHD Services, the 19-minute project moves through Fl3X, Supreme, Femini$T, Burtifly, Para, Guap Cha$Er, Pasta and Datiemo — presenting an artist still expanding the boundaries of his sound.",
    approach: [
      { label: "The Signal", description: "DARK ERA marks Mamuzo’s movement from a run of individual singles and collaborations into a more defined album-era identity." },
      { label: "The Sound", description: "Eight compact tracks move between confidence, ambition, street energy and experimentation, with Mamuzo at the centre of a broad collaborator circle." },
      { label: "The World", description: "The title, official artwork and range of featured voices establish the first visual and cultural coordinates of this new chapter." },
      { label: "The Peak", description: "Rather than overstate commercial success, DARK ERA is a credible marker of where Mamuzo’s sound stands now — and where it can go next." },
    ],
    gallery: [
      { tone: "flare", span: "full", caption: "DARK ERA — live signal", imageQuery: "Nigerian musician live performance purple light", imageUrl: "/mamuzo/img_3953.jpg" },
      { tone: "warm", span: "half", caption: "The room comes alive", imageQuery: "Nigerian musician live performance purple light", imageUrl: "/mamuzo/img_3960.jpg" },
      { tone: "mono", span: "half", caption: "Eight tracks, one chapter", imageQuery: "Nigerian musician live performance purple light", imageUrl: "/mamuzo/img_3961.jpg" },
      { tone: "flare", span: "third", caption: "Pasta — first listen", imageQuery: "Nigerian musician live performance purple light", imageUrl: "/mamuzo/img_3963.jpg" },
      { tone: "warm", span: "third", caption: "The collaborator energy", imageQuery: "Nigerian musician live performance purple light", imageUrl: "/mamuzo/img_3965.jpg" },
      { tone: "mono", span: "third", caption: "The next frequency", imageQuery: "Nigerian artist backstage portrait dark light", imageUrl: "/mamuzo/img_3966.jpg" },
    ],
    hasVideoMoment: true,
    videoUrl: "https://www.youtube.com/embed/FLtDcQjhxNI?rel=0&modestbranding=1",
    results: [
      { value: "150K", label: "Accumulated streams" },
      { value: "19:25", label: "Minutes of music" },
      { value: "08", label: "Tracks on DARK ERA" },
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
    destinationUrl: "/ontheradar/articles/bhadboi-dela-building-his-own-sound-one-record-at-a-time",
    client: "BhadBoi dela / RADARArticles",
    title: "Building His Own Sound, One Record at a Time",
    oneLiner: "From Delta State to Surulere, BhadBoi dela is turning his journey into an energetic sound built to travel.",
    role: "RADARArticles, Artist Profile",
    year: "2026",
    scope: "Artist profile, sound identity, release story",
    deliverables: "Editorial feature, artist portrait, music embeds",
    heroTone: "warm",
    heroImageQuery: "BhadBoi dela artist portrait",
    heroImageUrl: "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/08/IMG_5006-scaled.jpeg",
    breakImageQuery: "BhadBoi dela Nigerian musician portrait",
    brief: "BhadBoi dela is building a distinct sound from the experiences, energy, and ambition that connect Delta State, Surulere, and the next chapter of his artist journey.",
    approach: [
      { label: "Root", description: "A journey from Delta State to the streets and creative energy of Surulere, Lagos." },
      { label: "Shape", description: "A sound drawn from personal experience, movement, and the realities around him." },
      { label: "Move", description: "An energetic, rave-influenced direction built to connect beyond the immediate environment." },
      { label: "Rise", description: "A growing catalogue and artist identity with ambition to travel far beyond where the story began." },
    ],
    gallery: [
      { tone: "warm", span: "full", caption: "BhadBoi dela — the artist", imageUrl: "https://radarcharts.net/wp-content/uploads/2026/08/IMG_5005-1024x1024.jpeg", imageQuery: "BhadBoi dela artist portrait" },
      { tone: "mono", span: "half", caption: "One record at a time", imageUrl: "https://radarcharts.net/wp-content/uploads/2026/08/IMG_3726-819x1024.jpeg", imageQuery: "BhadBoi dela musician portrait" },
      { tone: "warm", span: "half", caption: "Building his own sound", imageUrl: "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/08/IMG_5006-scaled.jpeg", imageQuery: "BhadBoi dela artist" },
      { tone: "mono", span: "third", caption: "Shokoto", imageQuery: "Nigerian artist music release" },
      { tone: "warm", span: "third", caption: "ROCKSTAR Vol. 1", imageQuery: "Nigerian musician recording studio" },
      { tone: "mono", span: "third", caption: "The next record", imageQuery: "music microphone studio portrait" },
    ],
    hasVideoMoment: true,
    results: [
      { value: "03", label: "Images imported" },
      { value: "02", label: "Music embeds" },
      { value: "01", label: "Sound in motion" },
    ],
    credits: [
      { role: "Artist", name: "BhadBoi dela / Nwogo Mandela" },
      { role: "Editorial", name: "RADARCharts by REM" },
      { role: "Source", name: "RADARArticles" },
    ],
    featured: true,
  },
  {
    slug: "north-star-release",
    destinationUrl: "/ontheradar/articles/rhia-bello-invites-everyone-to-celebrate-connect-and-drink-up",
    client: "Rhia Bello / MOTHERLand",
    title: "Rhia Bello Invites Everyone to Celebrate, Connect and ‘Drink Up’",
    oneLiner: "A vibrant house record becomes an invitation to celebrate life, embrace community, and live fully in the moment.",
    role: "MOTHERLand, Artist Feature",
    year: "2026",
    scope: "Artist feature, single story, listening moment",
    deliverables: "Editorial feature, artist portrait, Spotify embed",
    heroTone: "warm",
    heroImageQuery: "Rhia Bello artist portrait",
    heroImageUrl: "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/IMG_2325.jpeg",
    breakImageQuery: "Rhia Bello Nigerian musician portrait",
    brief: "Rhia Bello’s ‘Drink Up’ turns vibrant house rhythms and fearless energy into a shared space for celebration, connection, and musical transformation.",
    approach: [
      { label: "Celebrate", description: "A record built around vibrant house rhythms, infectious energy, and the atmosphere of a great celebration." },
      { label: "Connect", description: "A message of togetherness where friends become family and ordinary moments become lasting memories." },
      { label: "Transform", description: "A new chapter shaped by musical freedom, experimentation, and the courage to explore new territory." },
      { label: "Drink Up", description: "A listening moment for the people who show up for one another and bring good energy to the room." },
    ],
    gallery: [
      { tone: "warm", span: "full", caption: "Rhia Bello — Drink Up", imageUrl: "https://radarcharts.net/wp-content/uploads/2026/09/IMG_2322-1024x1024.jpeg", imageQuery: "Rhia Bello artist portrait" },
      { tone: "mono", span: "half", caption: "Celebrate and connect", imageUrl: "https://radarcharts.net/wp-content/uploads/2026/09/IMG_2324-1024x1024.jpeg", imageQuery: "Rhia Bello musician portrait" },
      { tone: "warm", span: "half", caption: "A new chapter", imageUrl: "https://i0.wp.com/radarcharts.net/wp-content/uploads/2026/09/IMG_2325.jpeg", imageQuery: "Rhia Bello artist" },
      { tone: "mono", span: "third", caption: "Drink Up", imageQuery: "house music celebration" },
      { tone: "warm", span: "third", caption: "Good energy", imageQuery: "friends celebrating music" },
      { tone: "mono", span: "third", caption: "Live fully", imageQuery: "dancefloor music lights" },
    ],
    hasVideoMoment: false,
    results: [
      { value: "03", label: "Images imported" },
      { value: "01", label: "Spotify embed" },
      { value: "01", label: "New chapter" },
    ],
    credits: [
      { role: "Artist", name: "Rhia Bello" },
      { role: "Editorial", name: "RADARCharts by REM" },
      { role: "Project", name: "MOTHERLand" },
    ],
    featured: false,
  },
];

export function getCaseStudy(slug: string) { return caseStudies.find((c) => c.slug === slug); }
export function getAdjacentCaseStudy(slug: string) {
  const index = caseStudies.findIndex((c) => c.slug === slug);
  return caseStudies[(index + 1) % caseStudies.length] ?? caseStudies[0];
}
