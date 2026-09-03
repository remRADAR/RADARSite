export type MediaTone = "warm" | "cool" | "mono" | "flare";

export type ApproachStep = {
  label: string;
  description: string;
};

export type GalleryItem = {
  tone: MediaTone;
  span: "full" | "half" | "third";
  caption: string;
  /** Unsplash search query for this slot; falls back to the generative tone if unavailable. */
  imageQuery: string;
};

export type ResultStat = {
  value: string;
  label: string;
};

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
  /** Unsplash search query for the hero / work-grid / teaser image. */
  heroImageQuery: string;
  /** Unsplash search query for the full-bleed imagery break on the case study page. */
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
    slug: "halcyon-rebrand",
    client: "Halcyon",
    title: "Rebuilding a century-old spirits house for its next fifty years",
    oneLiner: "A full identity, packaging, and film relaunch that tripled shelf stand-out.",
    role: "Brand, Packaging, Film",
    year: "2025",
    scope: "Identity system, packaging, launch film",
    deliverables: "Brand system, 6 SKUs, 90s film, retail toolkit",
    heroTone: "flare",
    heroImageQuery: "premium whiskey bottle dark moody studio",
    breakImageQuery: "copper distillery still warm cinematic light",
    brief:
      "Halcyon had the liquid and the history but not the shelf presence — sixty years of equity buried under a label that read like a pharmacy tincture. We were asked to find the version of the brand that was always there, without losing the distillery's word-of-mouth credibility with bartenders.",
    approach: [
      {
        label: "Discover",
        description: "Distillery visits, bartender interviews, and a full shelf audit across 40 competitor SKUs.",
      },
      {
        label: "Define",
        description: "A single organizing idea — 'the pause before the pour' — carried across every touchpoint.",
      },
      {
        label: "Design",
        description: "Typography, bottle form, and a restrained warm palette drawn from the copper stills.",
      },
      {
        label: "Deliver",
        description: "Packaging production, a 90-second launch film, and an on-premise toolkit for bar teams.",
      },
    ],
    gallery: [
      {
        tone: "flare",
        span: "full",
        caption: "Bottle system, six expressions",
        imageQuery: "whiskey bottles lineup product photography",
      },
      {
        tone: "warm",
        span: "half",
        caption: "Label die-line detail",
        imageQuery: "vintage label typography print detail",
      },
      { tone: "mono", span: "half", caption: "Typography specimen", imageQuery: "letterpress typography specimen" },
      { tone: "flare", span: "third", caption: "Still house, 4am", imageQuery: "distillery copper still night" },
      { tone: "warm", span: "third", caption: "Copper detail", imageQuery: "copper metal texture macro" },
      { tone: "mono", span: "third", caption: "Retail toolkit", imageQuery: "liquor store shelf bottles" },
    ],
    hasVideoMoment: true,
    results: [
      { value: "3.1×", label: "Shelf stand-out lift, in-store testing" },
      { value: "40%", label: "On-premise placement growth, 6 months" },
      { value: "12", label: "Markets relaunched into" },
    ],
    credits: [
      { role: "Creative Direction", name: "Northlight" },
      { role: "Client", name: "Halcyon Distilling Co." },
      { role: "Film Direction", name: "Northlight Motion" },
      { role: "Glass Engineering", name: "Ardent Bottle Works" },
    ],
    featured: true,
  },
  {
    slug: "vantage-motors-launch",
    client: "Vantage Motors",
    title: "Launching an electric marque with no showroom and no dealers",
    oneLiner: "A direct-to-driver launch campaign built entirely around one film.",
    role: "Campaign, Film, Digital",
    year: "2024",
    scope: "Launch campaign, film, digital platform",
    deliverables: "Campaign film, 14-city tour, launch site",
    heroTone: "cool",
    heroImageQuery: "sleek electric car dark studio cinematic",
    breakImageQuery: "modern car silhouette dramatic lighting",
    brief:
      "Vantage was entering a crowded EV market with zero brand recognition and a direct-to-consumer model that skipped dealerships entirely. The brief was to make the car famous before a single unit shipped, using nothing but craft and restraint against competitors spending ten times the budget.",
    approach: [
      { label: "Discover", description: "Engineering deep-dive with the powertrain team to find the real story." },
      { label: "Define", description: "Positioning around silence and control rather than speed and spectacle." },
      { label: "Design", description: "A monochrome campaign system built to survive any billboard or feed." },
      { label: "Deliver", description: "Flagship film, 14-city driving tour, and a reservation-first launch site." },
    ],
    gallery: [
      { tone: "cool", span: "full", caption: "Test track, first light", imageQuery: "car test track sunrise" },
      { tone: "mono", span: "half", caption: "Interior detail", imageQuery: "car interior minimalist dashboard" },
      { tone: "cool", span: "half", caption: "Charging bay", imageQuery: "ev charging station night" },
      { tone: "mono", span: "third", caption: "Tour build-out", imageQuery: "event stage build production" },
      { tone: "cool", span: "third", caption: "Wind tunnel", imageQuery: "automotive wind tunnel testing" },
      { tone: "mono", span: "third", caption: "Launch site, hero frame", imageQuery: "minimalist car photography studio" },
    ],
    hasVideoMoment: true,
    results: [
      { value: "58k", label: "Reservations in launch week" },
      { value: "2.4M", label: "Film views, organic only" },
      { value: "14", label: "Cities on the driving tour" },
    ],
    credits: [
      { role: "Creative Direction", name: "Northlight" },
      { role: "Client", name: "Vantage Motors" },
      { role: "Production Partner", name: "Roadhouse Films" },
    ],
    featured: false,
  },
  {
    slug: "kestrel-field-campaign",
    client: "Kestrel",
    title: "Taking a technical outerwear brand out of the catalog and into the field",
    oneLiner: "A campaign shot entirely on the routes the gear was built for.",
    role: "Campaign, Photography, Retail",
    year: "2024",
    scope: "Campaign system, photography, retail windows",
    deliverables: "Campaign system, 200+ image library, window program",
    heroTone: "mono",
    heroImageQuery: "dramatic mountain ridge alpine cinematic",
    breakImageQuery: "alpine mountains dawn fog cinematic",
    brief:
      "Kestrel's product was best-in-class but the marketing looked like every other technical outerwear brand — grey studio shots on white seamless. We proposed retiring the studio entirely and building the whole campaign from footage shot on the actual routes the gear is tested on.",
    approach: [
      { label: "Discover", description: "Field trips with the product team across three test routes." },
      { label: "Define", description: "A campaign built on proof, not aspiration — real conditions, real mileage." },
      { label: "Design", description: "A modular grid system that could flex from window vinyl to social crops." },
      { label: "Deliver", description: "A 200+ image library, retail window program, and a wholesale toolkit." },
    ],
    gallery: [
      { tone: "mono", span: "full", caption: "Ridge line, first ascent", imageQuery: "mountain ridge climbing dawn" },
      { tone: "warm", span: "half", caption: "Fabric detail, 400x", imageQuery: "technical fabric texture macro" },
      { tone: "mono", span: "half", caption: "Basecamp, 5:40am", imageQuery: "mountain basecamp tent morning" },
      { tone: "warm", span: "third", caption: "Stitch detail", imageQuery: "outerwear jacket stitching detail" },
      { tone: "mono", span: "third", caption: "Storm pitch", imageQuery: "mountain storm clouds hiker" },
      { tone: "warm", span: "third", caption: "Retail window install", imageQuery: "retail store window display" },
    ],
    hasVideoMoment: false,
    results: [
      { value: "27%", label: "Wholesale sell-through increase" },
      { value: "200+", label: "Images in the resulting library" },
      { value: "3", label: "Routes shot, zero studio days" },
    ],
    credits: [
      { role: "Creative Direction", name: "Northlight" },
      { role: "Client", name: "Kestrel" },
      { role: "Photography", name: "Northlight Studio" },
    ],
    featured: false,
  },
];

export function getCaseStudy(slug: string) {
  return caseStudies.find((c) => c.slug === slug);
}

export function getAdjacentCaseStudy(slug: string) {
  const index = caseStudies.findIndex((c) => c.slug === slug);
  if (index === -1) return caseStudies[0];
  return caseStudies[(index + 1) % caseStudies.length];
}
