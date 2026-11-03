// Editorial intake validation for the RADARCharts Automated Editorial Publishing Network.
// Pure validation only: this module never fabricates missing information and never
// performs side effects. It defines one branched intake contract for Press, Spotlight,
// Magazine (Special Episode / Magazine Episode) and MOTHERLand assignments, following
// the RADARCharts Article Master skill and the existing Editorial Pipeline schema.

export type EditorialContentType = "Press" | "Spotlight" | "Magazine" | "MOTHERLand";
export type MagazineSubtype = "Special Episode" | "Magazine Episode";

export const EDITORIAL_CONTENT_TYPES: EditorialContentType[] = ["Press", "Spotlight", "Magazine", "MOTHERLand"];
export const MAGAZINE_SUBTYPES: MagazineSubtype[] = ["Special Episode", "Magazine Episode"];

export type EmbedProvider = "spotify" | "youtube";

export type EditorialEmbed = {
  provider: EmbedProvider;
  url: string;
  /** Optional track title used for safe embed placement rules. */
  trackTitle?: string;
};

export type VerifiedQuote = {
  quote: string;
  attribution: string;
};

export type ArticleIntakeBrief = {
  /** Working topic, release or subject of the article. */
  workingTitle: string;
  contentType: EditorialContentType;
  /** Required when and only when contentType is Magazine. */
  magazineSubtype?: string;
  purposeAngle: string;
  targetAudience?: string;
  tone?: string;
  approximateLength?: string;
  mustIncludeFacts?: string[];
  claimsToAvoid?: string[];
  sourceUrls: string[];
  verifiedQuotes?: VerifiedQuote[];
  officialLinks?: string[];
  embeds?: EditorialEmbed[];
  /** Music entity metadata, when relevant. Optional fields stay optional. */
  musicEntity?: {
    artistNames?: string[];
    trackTitle?: string;
    releaseTitle?: string;
    version?: string;
    releaseDate?: string;
    collaborators?: string[];
    producers?: string[];
    songwriters?: string[];
    label?: string;
  };
  author?: string;
  tags?: string[];
  featuredPlacementRequested?: boolean;
  seoPreferences?: { seoTitle?: string; metaDescription?: string; keyphrase?: string };
  confirmedPublicationDate?: string;
  additionalInstructions?: string;
};

export type IntakeValidation = {
  ok: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
};

function httpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function validateEmbed(embed: EditorialEmbed): { ok: boolean; reason?: string } {
  if (embed.provider !== "spotify" && embed.provider !== "youtube") return { ok: false, reason: "unsupported provider" };
  if (!httpsUrl(embed.url)) return { ok: false, reason: "url must be public https" };
  const host = new URL(embed.url).hostname.toLowerCase();
  if (embed.provider === "spotify" && !host.endsWith("open.spotify.com")) return { ok: false, reason: "spotify embed must use open.spotify.com" };
  if (embed.provider === "youtube" && !(host === "youtube.com" || host === "www.youtube.com" || host === "youtu.be" || host === "www.youtu.be")) return { ok: false, reason: "youtube embed host not allowed" };
  return { ok: true };
}

export function validateIntakeBrief(input: Partial<ArticleIntakeBrief>): IntakeValidation {
  const errors: IntakeValidation["errors"] = [];
  const warnings: IntakeValidation["warnings"] = [];

  if (!input.workingTitle || !input.workingTitle.trim()) errors.push({ field: "workingTitle", message: "working topic is required" });
  if (!input.contentType || !EDITORIAL_CONTENT_TYPES.includes(input.contentType as EditorialContentType)) {
    errors.push({ field: "contentType", message: `contentType must be one of ${EDITORIAL_CONTENT_TYPES.join(", ")}` });
  } else if (input.contentType === "Magazine") {
    if (!input.magazineSubtype || !MAGAZINE_SUBTYPES.includes(input.magazineSubtype as MagazineSubtype)) {
      errors.push({ field: "magazineSubtype", message: `Magazine requires a subtype of ${MAGAZINE_SUBTYPES.join(" or ")}` });
    }
  } else if (input.magazineSubtype) {
    errors.push({ field: "magazineSubtype", message: "magazineSubtype is only valid for Magazine articles" });
  }
  if (!input.purposeAngle || !input.purposeAngle.trim()) errors.push({ field: "purposeAngle", message: "editorial angle is required" });
  if (!Array.isArray(input.sourceUrls) || !input.sourceUrls.length) {
    errors.push({ field: "sourceUrls", message: "at least one source URL is required" });
  } else {
    input.sourceUrls.forEach((url, index) => {
      if (!httpsUrl(url)) errors.push({ field: `sourceUrls[${index}]`, message: "source url must be public https" });
    });
  }
  (input.verifiedQuotes || []).forEach((quote, index) => {
    if (!quote.quote || !quote.quote.trim()) errors.push({ field: `verifiedQuotes[${index}].quote`, message: "quote text is required" });
    if (!quote.attribution || !quote.attribution.trim()) errors.push({ field: `verifiedQuotes[${index}].attribution`, message: "every quote requires attribution" });
  });
  (input.officialLinks || []).forEach((url, index) => {
    if (!httpsUrl(url)) errors.push({ field: `officialLinks[${index}]`, message: "official link must be public https" });
  });
  (input.embeds || []).forEach((embed, index) => {
    const result = validateEmbed(embed);
    if (!result.ok) errors.push({ field: `embeds[${index}]`, message: result.reason || "invalid embed" });
  });
  if (input.confirmedPublicationDate && !Number.isFinite(Date.parse(input.confirmedPublicationDate))) {
    errors.push({ field: "confirmedPublicationDate", message: "publication date must be a valid date" });
  }
  if (!input.author) warnings.push({ field: "author", message: "author not supplied; defaults to the RADARCharts by REM editorial label" });
  if (!input.musicEntity && (input.contentType === "Press" || input.contentType === "Spotlight")) {
    warnings.push({ field: "musicEntity", message: "no music entity metadata supplied; entity checks will be limited to supplied sources" });
  }
  if (input.seoPreferences && input.seoPreferences.metaDescription && input.seoPreferences.metaDescription.length > 180) {
    warnings.push({ field: "seoPreferences.metaDescription", message: "meta description exceeds the 140-160 character guideline" });
  }

  return { ok: errors.length === 0, errors, warnings };
}
