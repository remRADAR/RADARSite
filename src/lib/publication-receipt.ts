// Publication receipt for the RADARCharts Automated Editorial Publishing Network.
// A Notion draft is not a website publication: published_verified is only set with
// evidence from the live website. Pure builder: no network calls.

export type PublicationState = "draft_saved" | "awaiting_approval" | "publishing" | "published_verified" | "failed";

export type LiveVerificationEvidence = {
  /** True only when the live page returned the expected article content, featured image, embeds and metadata. */
  liveUrlVerified: boolean;
  statusCode?: number;
  expectedTitlePresent?: boolean;
  featuredImagePresent?: boolean;
  embedsPresent?: boolean;
  metadataPresent?: boolean;
  verifiedAt?: string;
};

export type MediaCheck = { role: "featured" | "inline" | "embed" | "streaming-link"; label: string; verified: boolean; detail?: string };

export type ReceiptInput = {
  articleTitle: string;
  articleType: string;
  magazineSubtype?: string;
  publicationState: PublicationState;
  notionRecordUrl?: string;
  cmsId?: string;
  liveUrl?: string;
  liveVerification?: LiveVerificationEvidence;
  mediaChecks?: MediaCheck[];
  seoMetadataComplete?: boolean;
  warnings?: string[];
  editorialBlockers?: string[];
  failureReason?: string;
  failedStep?: string;
};

export type PublicationReceipt = {
  articleTitle: string;
  articleType: string;
  magazineSubtype?: string;
  state: PublicationState;
  notionRecordUrl?: string;
  liveUrl?: string;
  cmsId?: string;
  publishedVerified: boolean;
  mediaChecks: MediaCheck[];
  seoMetadataComplete: boolean;
  warnings: string[];
  editorialBlockers: string[];
  failure?: { step: string; reason: string };
  verifiedAt?: string;
  generatedAt: string;
};

export function buildPublicationReceipt(input: ReceiptInput): PublicationReceipt {
  const blockers = [...(input.editorialBlockers || [])];
  const warnings = [...(input.warnings || [])];

  if (input.publicationState === "published_verified") {
    if (!input.liveVerification?.liveUrlVerified) {
      blockers.push("published_verified requested without live-website verification evidence; state was downgraded to publishing");
    } else if (!input.liveUrl) {
      blockers.push("published_verified requires the verified live URL; state was downgraded to publishing");
    }
  }
  const verifiedState: PublicationState = (() => {
    if (input.publicationState !== "published_verified") return input.publicationState;
    const evidenceOd = Boolean(input.liveVerification?.liveUrlVerified && input.liveUrl);
    return evidenceOk ? "published_verified" : "publishing";
  })();

  if (verifiedState === "published_verified" && !input.cmsId) {
    warnings.push("cms id was not returned by the publishing integration; receipt omits it");
  }
  if (verifiedState === "published_verified" && input.liveVerification?.statusCode && input.liveVerification.statusCode >= 400) {
    blockers.push("live verification recorded an unsuccessful status code");
  }

  return {
    articleTitle: input.articleTitle,
    articleType: input.articleType,
    magazineSubtype: input.magazineSubtype,
    state: verifiedState,
    notionRecordUrl: input.notionRecordUrl,
    liveUrl: verifiedState === "published_verified" ? input.liveUrl : undefined,
    cmsId: input.cmsId,
    publishedVerified: verifiedState === "published_verified",
    mediaChecks: input.mediaChecks || [],
    seoMetadataComplete: Boolean(input.seoMetadataComplete),
    warnings,
    editorialBlockers: blockers,
    failure: input.publicationState === "failed" ? { step: input.failedStep || "unknown", reason: input.failureReason || "unspecified failure" } : undefined,
    verifiedAt: verifiedState === "published_verified" ? input.liveVerification?.verifiedAt || new Date().toISOString() : undefined,
    generatedAt: new Date().toISOString()
   };
}
