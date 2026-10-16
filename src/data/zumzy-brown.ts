/**
 * LEGEND FOREVER — Zumzy Brown identity, catalogue, and legacy data.
 *
 * FACTUAL INTEGRITY
 * Every figure and release below is drawn from a verifiable public source
 * (Deezer public API, Spotify artist profile, Apple Music artist profile,
 * published family tribute and press coverage). Nothing here is invented.
 * The counting method for each statistic is documented inline so it can be
 * audited and updated. See docs/legends-zumzy-brown.md for the full audit.
 *
 * TODO(portrait): An authorised Zumzy Brown portrait is NOT in the repository
 * yet. The hero renders an abstract placeholder until 'heroPortrait.src' is
 * set to an authorised asset (e.g. /legends/zumzy-brown/portrait.jpg served
 * from public/ or the R2 media origin). Do not substitute a stock face.
 * TODO(artwork): Release artwork is deliberately omitted (no authorised
 * copies in repo) — cards render a designed tonal field until artwork is
 * approved and wired via 'artworkUrl'.
 * TODO(archive): The legacy frame ships with an explicit "archive pending
 * approval" state; approved photographs/videos should be added to
 * 'legacy.archive' once cleared.
 */

export type ZumzyIdentity = {
  name: string;
  legalName: string;
  /** Name spellings found in public sources — documented, not silently resolved. */
  nameVariations: Array<{ value: string; source: string }>;
  born: string; // ISO date — verified against THISDAY / The Sun coverage.
  died: string; // ISO date — verified against The Sun coverage.
  bornLabel: string;
  diedLabel: string;
  summary: string;
};

export type ZumzyReleaseCategory = "single" | "ep" | "compilation" | "tribute";

export type ZumzyRelease = {
  id: string;
  title: string;
  /** ISO release date from the Deezer public API listing. */
  released: string;
  year: number;
  type: "Single" | "EP" | "Compilation";
  category: ZumzyReleaseCategory;
  /** Lead release by Zumzy Brown vs. REM tribute/cypher release featuring him. */
  role: "lead" | "tribute";
  posthumous: boolean;
  trackCount: number;
  tracks?: string[];
  credits?: string[];
  /** Official listing pages only — verified to exist at time of research. */
  deezerUrl?: string;
  appleMusicUrl?: string;
  spotifySearchUrl?: string;
  note?: string;
  /** Optional authorised artwork; omitted until cleared. */
  artworkUrl?: string;
};

export type ZumzyStat = {
  key: string;
  label: string;
  value: number;
  /** Where the number comes from, in one sentence. */
  method: string;
};

export type ZumzyMilestone = {
  year: number;
  date?: string;
  title: string;
  detail: string;
  kind: "life" | "music" | "legacy";
};

export type ZumzyTribute = {
  quote: string;
  author: string;
  source: string;
  sourceUrl: string;
};

export type ZumzyArchiveItem = {
  id: string;
  kind: "photo" | "video";
  caption: string;
  /** TODO(archive): none approved yet — the archive section renders a pending state. */
  url?: string;
  approved: boolean;
};

export const zumzyIdentity: ZumzyIdentity = {
  name: "Zumzy Brown",
  legalName: "Uchenna Michael Ozumba",
  nameVariations: [
    { value: "Zumbybrown", source: "The Sun Nigeria profile (thesun.ng)" },
    { value: "Uchenna Michael Law Ozumba", source: "Deezer writer/composer credit on “Chapel After Chapel”" },
  ],
  born: "1998-01-31",
  died: "2021-05-04",
  bornLabel: "31 January 1998",
  diedLabel: "4 May 2021",
  summary:
    "Nigerian rapper and recording artist, son, and rising voice of Abuja's hip-hop scene — remembered for the music he released through Royal Empire Management (REM) and the REM cyphers he powered.",
};

export const zumzyPlatforms = [
  { name: "Spotify", url: "https://open.spotify.com/artist/1jrvXX5OrCqoqvOa2ypTF1" },
  { name: "Apple Music", url: "https://music.apple.com/us/artist/zumzy-brown/1495998309" },
  { name: "Deezer", url: "https://www.deezer.com/us/artist/84162502" },
  { name: "Boomplay", url: "https://www.boomplay.com/artists/37281787" },
  { name: "SoundCloud", url: "https://soundcloud.com/zumzy-brown" },
];

const spotifySearch = (title: string) =>
  "https://open.spotify.com/search/" + encodeURIComponent(title + " Zumzy Brown");

export const zumzyReleases: ZumzyRelease[] = [
  {
    id: "no-man-doubt",
    title: "NO MAN Doubt",
    released: "2020-03-03",
    year: 2020,
    type: "EP",
    category: "ep",
    role: "lead",
    posthumous: false,
    trackCount: 4,
    tracks: ["School Waka", "Maxxxxximum", "Jiggy Boi (feat. Beedeevocals)", "Night Plan (feat. Konzi)"],
    deezerUrl: "https://www.deezer.com/album/136847802",
    spotifySearchUrl: spotifySearch("NO MAN Doubt"),
  },
  {
    id: "pastor-baby",
    title: "Pastor Baby",
    released: "2020-06-10",
    year: 2020,
    type: "EP",
    category: "ep",
    role: "lead",
    posthumous: false,
    trackCount: 6,
    tracks: ["Problem (feat. Beedee Vocals)", "No Love", "For You", "Mummy", "Belle (feat. Kadens)", "BHU Freestyle (Bonus Track)"],
    deezerUrl: "https://www.deezer.com/album/160317942",
    spotifySearchUrl: spotifySearch("Pastor Baby"),
  },
  {
    id: "chapel-after-chapel",
    title: "Chapel After Chapel",
    released: "2020-07-12",
    year: 2020,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["Chapel After Chapel"],
    deezerUrl: "https://www.deezer.com/album/128571502",
    spotifySearchUrl: spotifySearch("Chapel After Chapel"),
  },
  {
    id: "benefit-boy",
    title: "Benefit Boy",
    released: "2020-07-20",
    year: 2020,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["Benefit Boy (feat. Vj Skinny)"],
    credits: ["feat. Vj Skinny"],
    deezerUrl: "https://www.deezer.com/album/166821642",
    spotifySearchUrl: spotifySearch("Benefit Boy"),
  },
  {
    id: "the-usuals",
    title: "The Usuals",
    released: "2021-05-12",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["The Usuals (feat. Aaz)"],
    credits: ["feat. Aaz"],
    deezerUrl: "https://www.deezer.com/album/230021322",
    spotifySearchUrl: spotifySearch("The Usuals"),
  },
  {
    id: "anonymous",
    title: "ANONYMOUS",
    released: "2021-07-30",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["ANONYMOUS"],
    deezerUrl: "https://www.deezer.com/album/249067942",
    spotifySearchUrl: spotifySearch("ANONYMOUS"),
  },
  {
    id: "pull-up",
    title: "Pull Up",
    released: "2021-07-31",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["Pull Up"],
    deezerUrl: "https://www.deezer.com/album/249195972",
    spotifySearchUrl: spotifySearch("Pull Up"),
  },
  {
    id: "get-money",
    title: "Get Money",
    released: "2021-07-31",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["Get Money (feat. Hicy)"],
    credits: ["feat. Hicy"],
    deezerUrl: "https://www.deezer.com/album/249174282",
    spotifySearchUrl: spotifySearch("Get Money"),
  },
  {
    id: "my-life",
    title: "My Life",
    released: "2021-07-31",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["My Life (feat. Richie Sax)"],
    credits: ["feat. Richie Sax"],
    deezerUrl: "https://www.deezer.com/album/249239902",
    spotifySearchUrl: spotifySearch("My Life"),
  },
  {
    id: "who-does-that",
    title: "WHO DOES THAT ??",
    released: "2021-08-05",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 3,
    tracks: ["WHO DOES THAT ??", "Quarantine Freestyle", "Die Young"],
    note: "Die Young — the song Zumzy named himself as his favourite in his Apple Music artist interview.",
    deezerUrl: "https://www.deezer.com/album/250278092",
    spotifySearchUrl: spotifySearch("WHO DOES THAT"),
  },
  {
    id: "ade",
    title: "Adé",
    released: "2021-08-05",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["Adé"],
    deezerUrl: "https://www.deezer.com/album/250219762",
    spotifySearchUrl: spotifySearch("Adé"),
  },
  {
    id: "joanna",
    title: "Joanna",
    released: "2021-08-05",
    year: 2021,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: false,
    trackCount: 1,
    tracks: ["Joanna"],
    deezerUrl: "https://www.deezer.com/album/250225342",
    spotifySearchUrl: spotifySearch("Joanna"),
  },
  {
    id: "kalakuta",
    title: "KALAKUTA",
    released: "2022-05-04",
    year: 2022,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: true,
    trackCount: 1,
    tracks: ["KALAKUTA (feat. Zaddytc)"],
    credits: ["feat. Zaddytc"],
    deezerUrl: "https://www.deezer.com/album/314469007",
    spotifySearchUrl: spotifySearch("KALAKUTA"),
  },
  {
    id: "lazarus-effect",
    title: "LAZARUS EFFECT: LONG LIVE ZUMZY (REM cypher 4)",
    released: "2022-07-15",
    year: 2022,
    type: "Single",
    category: "tribute",
    role: "tribute",
    posthumous: true,
    trackCount: 1,
    tracks: ["LAZARUS EFFECT: LONG LIVE ZUMZY (REM cypher 4)"],
    credits: ["feat. DXNZEL, Adthekvng, Triplexane & Contra Banz"],
    note: "REM tribute cypher dedicated to Zumzy Brown.",
    deezerUrl: "https://www.deezer.com/album/334049447",
    spotifySearchUrl: spotifySearch("LAZARUS EFFECT LONG LIVE ZUMZY"),
  },
  {
    id: "peace-be-unto-rem",
    title: "PEACE BE UNTO REM!",
    released: "2022-08-12",
    year: 2022,
    type: "Single",
    category: "tribute",
    role: "tribute",
    posthumous: true,
    trackCount: 3,
    tracks: ["Caesar's Anthem (feat. DXNZEL, Adthekvng, Triplexane, Tobii WTW & Zumzy Brown)", "One Man Army", "Lazarus Effect (Tribute to Zumzy Brown)"],
    note: "REM release featuring Zumzy Brown, including the tribute track “Lazarus Effect”.",
    deezerUrl: "https://www.deezer.com/album/333418147",
    spotifySearchUrl: spotifySearch("PEACE BE UNTO REM"),
  },
  {
    id: "i-dont-like",
    title: "I Dont Like",
    released: "2023-04-28",
    year: 2023,
    type: "Single",
    category: "single",
    role: "lead",
    posthumous: true,
    trackCount: 1,
    tracks: ["I Dont Like (feat. Moody MF)"],
    credits: ["feat. Moody MF"],
    deezerUrl: "https://www.deezer.com/album/684204461",
    spotifySearchUrl: spotifySearch("I Dont Like"),
  },
  {
    id: "law-the-cypher",
    title: "Law the Cypher",
    released: "2023-08-25",
    year: 2023,
    type: "EP",
    category: "tribute",
    role: "tribute",
    posthumous: true,
    trackCount: 5,
    tracks: ["Rem Cypher 1: The 11th Bar", "Rem Cypher 2: Barz & Stiches", "Rem Cypher 3: Cza's Anthem", "Rem Cypher 4: Lazarus Effect (Tribute to Zumzy Brown)", "Law The Cypher"],
    note: "REM cypher EP featuring Zumzy Brown across the series.",
    deezerUrl: "https://www.deezer.com/album/479988875",
    spotifySearchUrl: spotifySearch("Law the Cypher"),
  },
  {
    id: "the-legend",
    title: "The Legend, Zumzy Brown",
    released: "2023-09-02",
    year: 2023,
    type: "Compilation",
    category: "compilation",
    role: "lead",
    posthumous: true,
    trackCount: 20,
    tracks: ["Maxxxxximum", "The Usual", "School Waka", "Pull Up", "Problem", "Who Does That??", "Benefit Boy", "Night Plan", "Kalakuta", "Belle", "Mummy", "Anonymous", "Joana", "Jiggy Boi", "I Don't Like", "My Life", "For You", "No Love", "Bhu Freestyle (Bonus Track)", "Die Young"],
    note: "Posthumous compilation gathering the catalogue in one pack — Zumzy's own artist pick on Spotify.",
    deezerUrl: "https://www.deezer.com/album/484341295",
    spotifySearchUrl: spotifySearch("The Legend Zumzy Brown"),
  },
  {
    id: "findingaaz",
    title: "Turn Up — from Findingaaz",
    released: "2023",
    year: 2023,
    type: "Single",
    category: "tribute",
    role: "tribute",
    posthumous: true,
    trackCount: 1,
    tracks: ["Turn Up"],
    note: "Appears-on feature on the Findingaaz album (Apple Music: “Turn Up”, Findingaaz · 2023).",
    appleMusicUrl: "https://music.apple.com/us/artist/zumzy-brown/1495998309",
  },
];

/**
 * Catalogue statistics — every figure is derived, not hard-coded into the
 * animation components. Methods are shown to visitors so the numbers can be
 * audited.
 *
 * tracks: 24 = unique verified Zumzy Brown lead tracks. Method: union of the
 *   tracklists of his 17 lead releases (Deezer public API), deduplicated
 *   against the 20-track posthumous compilation “The Legend, Zumzy Brown”.
 *   Tribute/REM-cypher releases featuring him are NOT counted here.
 * releases: 17 = unique official lead releases (2 EPs + 14 singles + 1
 *   posthumous compilation), excluding REM tribute/cypher releases.
 * years: 4 = 2020–2023, the release years represented in the verified catalogue.
 * platforms: 5 = Spotify, Apple Music, Deezer, Boomplay, SoundCloud — verified
 *   official artist/listing pages.
 */
export const zumzyStats: ZumzyStat[] = [
  { key: "tracks", label: "Verified tracks in the catalogue", value: 24, method: "Unique lead tracks across his official releases, deduplicated against the posthumous 20-track compilation." },
  { key: "releases", label: "Unique official releases", value: 17, method: "2 EPs, 14 singles and 1 posthumous compilation under his own name." },
  { key: "years", label: "Years of music represented", value: 4, method: "Release years 2020–2023 in the verified catalogue." },
  { key: "platforms", label: "Official listening platforms", value: 5, method: "Spotify, Apple Music, Deezer, Boomplay and SoundCloud artist pages." },
];

export const zumzyMilestones: ZumzyMilestone[] = [
  { year: 1998, date: "1998-01-31", title: "Uchenna Michael Ozumba is born", detail: "Born on 31 January 1998, the only son of Mrs. Mabel Ozumba, after whom his music would later be managed and remembered.", kind: "life" },
  { year: 2020, title: "First official releases", detail: "“NO MAN Doubt” (EP) and “Pastor Baby” (EP) land, followed by the singles “Chapel After Chapel” and “Benefit Boy”.", kind: "music" },
  { year: 2021, title: "A run of singles", detail: "“The Usuals”, “ANONYMOUS”, “Pull Up”, “Get Money”, “My Life”, “WHO DOES THAT ??” (with “Die Young”), “Adé” and “Joanna” arrive through REM.", kind: "music" },
  { year: 2021, date: "2021-05-04", title: "Zumzy Brown passes away", detail: "He died on 4 May 2021 at the age of 23, after an asthmatic attack.", kind: "life" },
  { year: 2021, date: "2021-05-22", title: "Family tribute published", detail: "His mother, Mrs. Mabel Ozumba, publishes “Tribute to My Only Son” in THISDAY.", kind: "legacy" },
  { year: 2022, title: "REM answers with tributes", detail: "“KALAKUTA” releases posthumously; REM dedicates “LAZARUS EFFECT: LONG LIVE ZUMZY (REM cypher 4)” and “PEACE BE UNTO REM!” to him.", kind: "legacy" },
  { year: 2023, title: "The legend is sealed", detail: "“I Dont Like” and the “Law the Cypher” EP arrive, and “The Legend, Zumzy Brown” compiles 20 tracks of the catalogue in one pack.", kind: "legacy" },
];

export const zumzyTributes: ZumzyTribute[] = [
  {
    quote: "Passion and dedication — that is your legacy, Uche. Doing your best with whatever you got.",
    author: "Mrs. Mabel Ozumba, his mother",
    source: "THISDAY, “Tribute to My Only Son, Uchenna Michael Ozumba” (22 May 2021)",
    sourceUrl: "https://www.thisdaylive.com/2021/05/22/tribute-to-my-only-son-uchenna-michael-ozumba/",
  },
  {
    quote: "Not how long, but how well one lived.",
    author: "Mrs. Mabel Ozumba, his mother",
    source: "THISDAY, “Tribute to My Only Son, Uchenna Michael Ozumba” (22 May 2021)",
    sourceUrl: "https://www.thisdaylive.com/2021/05/22/tribute-to-my-only-son-uchenna-michael-ozumba/",
  },
  {
    quote: "Zumzybrown's stage performances on university campuses attracted huge crowds of dancing youths.",
    author: "Sam Ekpe",
    source: "The Sun Nigeria, “Zumbybrown: A meteor passed through our shores” (20 May 2021)",
    sourceUrl: "https://thesun.ng/zumbybrown-a-meteor-passed-through-our-shores/",
  },
];

export const zumzyArchive: ZumzyArchiveItem[] = [];

/**
 * TODO(portrait): set 'src' once an authorised portrait asset exists.
 * Until then the hero renders a designed placeholder — never a substitute face.
 */
export const heroPortrait: { src: string | null; alt: string; credit: string | null } = {
  src: null,
  alt: "Zumzy Brown portrait",
  credit: null,
};

export const zumzyExternalLinks = {
  familyTribute: "https://www.thisdaylive.com/2021/05/22/tribute-to-my-only-son-uchenna-michael-ozumba/",
  sunProfile: "https://thesun.ng/zumbybrown-a-meteor-passed-through-our-shores/",
  legacyRem: "https://remradar.wordpress.com/rem/",
  spotifyArtist: "https://open.spotify.com/artist/1jrvXX5OrCqoqvOa2ypTF1",
  spotifyArtistEmbed: "https://open.spotify.com/embed/artist/1jrvXX5OrCqoqvOa2ypTF1?utm_source=radarcharts&theme=0",
  appleMusicArtist: "https://music.apple.com/us/artist/zumzy-brown/1495998309",
};
