// Teamily-ready workflow action contracts for the RADARCharts Automated Editorial
// Publishing Network. Each action is independently testable, returns a structured
// result, and failed jobs resume from the last confirmed step. This registry is a
// pure definition: Teamily (or any orchestrator) wires these actions together; it
// does not duplicate publishing logic.
//
// NOTE (2026-11-01): the original version of this file was corrupted in its Git blob
// (binary garbage from the seo-entity-audit entry onward, mangled at the original
// October push). This file was reconstructed from the intact head section and the
// documented contract (the "Editorial Publishing Network" ledger entry): ten
// actions, prerequisite graph, side-effect flags, a hard editorial-approval gate
// before publication, and resume-from-last-confirmed-step semantics. Nothing
// imports this module yet, so no consumer was affected by the corruption.

export type WorkflowActionId =
  | "intake-validation"
  | "research-verification"
  | "article-generation"
  | "seo-entity-audit"
  | "media-processing"
  | "notion-upsert"
  | "editorial-approval"
  | "radarsite-publication"
  | "live-page-verification"
  | "publication-receipt";

export type WorkflowActionDefinition = {
  id: WorkflowActionId;
  title: string;
  /** Actions that must be confirmed before this one can run. */
  requires: WorkflowActionId[];
  /** Side effects: actions marked true must never run without explicit authorization. */
  hasSideEffects: boolean;
  resultShape: string;
};

export const WORKFLOW_ACTIONS: WorkflowActionDefinition[] = [
  { id: "intake-validation", title: "Intake validation", requires: [], hasSideEffects: false, resultShape: "{ ok, errors, warnings }" },
  { id: "research-verification", title: "Research and fact verification", requires: ["intake-validation"], hasSideEffects: false, resultShape: "{ verifiedClaims, unresolvedDiscrepancies, sourceUrls }" },
  { id: "article-generation", title: "Article generation", requires: ["research-verification"], hasSideEffects: false, resultShape: "{ articlePackage }" },
  { id: "seo-entity-audit", title: "SEO and entity audit", requires: ["article-generation"], hasSideEffects: false, resultShape: "{ seoFindings, entityGaps, keyphraseRecommendations }" },
  { id: "media-processing", title: "Media processing", requires: ["seo-entity-audit"], hasSideEffects: false, resultShape: "{ processedAssets, mediaManifest }" },
  { id: "notion-upsert", title: "Notion upsert", requires: ["media-processing"], hasSideEffects: true, resultShape: "{ notionRecordUrl, notionRecordId }" },
  { id: "editorial-approval", title: "Editorial approval", requires: ["notion-upsert"], hasSideEffects: false, resultShape: "{ approved, approvedBy, approvalNotes }" },
  { id: "radarsite-publication", title: "RADARSite publication", requires: ["editorial-approval"], hasSideEffects: true, resultShape: "{ liveUrl, cmsId }" },
  { id: "live-page-verification", title: "Live page verification", requires: ["radarsite-publication"], hasSideEffects: false, resultShape: "{ liveUrlVerified, statusCode, checks }" },
  { id: "publication-receipt", title: "Publication receipt", requires: ["live-page-verification"], hasSideEffects: false, resultShape: "{ receipt }" },
];

export function getActionDefinition(id: WorkflowActionId): WorkflowActionDefinition {
  const definition = WORKFLOW_ACTIONS.find((action) => action.id === id);
  if (!definition) throw new Error(`Unknown workflow action: ${id}`);
  return definition;
}

/** True when every prerequisite of the action is in the confirmed set. */
export function prerequisitesSatisfied(id: WorkflowActionId, confirmed: WorkflowActionId[]): boolean {
  return getActionDefinition(id).requires.every((required) => confirmed.includes(required));
}

/** Hard editorial-approval gate: publication is never permitted without confirmed approval. */
export function isPublicationPermitted(confirmed: WorkflowActionId[]): boolean {
  return confirmed.includes("editorial-approval");
}

/** Resume-from-last-confirmed-step: the next unconfirmed action whose prerequisites are all confirmed. */
export function nextPendingAction(confirmed: WorkflowActionId[]): WorkflowActionDefinition | undefined {
  return WORKFLOW_ACTIONS.find((action) => !confirmed.includes(action.id) && prerequisitesSatisfied(action.id, confirmed));
}
