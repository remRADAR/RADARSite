// Teamily-ready workflow action contracts for the RADARCharts Automated Editorial
// Publishing Network. Each action is independently testable, returns a structured
// result, and failed jobs resume from the last confirmed step. This registry is a
// pure definition: Teamily (or any orchestrator) wires these actions together; it
// does not duplicate publishing logic.
//
// NOTE (2026-11-01): the original version of this file was corrupted in its Git blob
// (binary garbage from the seo-entity-audit entry onward, mangled at the original
// October push). It was rebuilt from the intact head section, the intact
// publication-receipt contract test that imports this module, and the documented
// contract (the "Editorial Publishing Network" ledger entry): ten actions,
// prerequisite graph, side-effect flags, a hard editorial-approval gate before any
// side-effecting action, and resume-from-last-confirmed-step semantics.

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

/** Progress state for one publication job. Failures never discard confirmed steps. */
export type WorkflowState = {
  confirmed: WorkflowActionId[];
  lastFailure?: { action: WorkflowActionId; reason: string };
};

export function getActionDefinition(id: WorkflowActionId): WorkflowActionDefinition {
  const definition = WORKFLOW_ACTIONS.find((action) => action.id === id);
  if (!definition) throw new Error(`Unknown workflow action: ${id}`);
  return definition;
}

/**
 * Whether an action is permitted to run from this state. Pure analysis actions
 * are permitted until confirmed; side-effecting actions additionally require the
 * hard editorial-approval gate (the confirmed editorial-approval step). Action
 * ordering is enforced by nextRunnableAction, not by this policy check.
 */
export function canRunAction(state: WorkflowState, id: WorkflowActionId): { ok: boolean; reason?: string } {
  const definition = getActionDefinition(id);
  if (state.confirmed.includes(id)) {
    return { ok: false, reason: `${definition.title} has already been confirmed` };
  }
  if (definition.hasSideEffects && !state.confirmed.includes("editorial-approval")) {
    return { ok: false, reason: `${definition.title} has side effects and requires editorial approval before it can run` };
  }
  return { ok: true };
}

/** Records an action as confirmed. The orchestrator produces the results; the registry only tracks progress. */
export function confirmAction(state: WorkflowState, id: WorkflowActionId): WorkflowState {
  if (state.confirmed.includes(id)) return state;
  return { ...state, confirmed: [...state.confirmed, id] };
}

/** Records a failure without discarding confirmed steps, so the job resumes from the last confirmed step. */
export function failAction(state: WorkflowState, id: WorkflowActionId, reason: string): WorkflowState {
  return { ...state, lastFailure: { action: id, reason } };
}

/** The next unconfirmed action whose prerequisites are all confirmed, in registry order; null when the job is complete. */
export function nextRunnableAction(state: WorkflowState): WorkflowActionId | null {
  const next = WORKFLOW_ACTIONS.find(
    (action) => !state.confirmed.includes(action.id) && action.requires.every((required) => state.confirmed.includes(required))
  );
  return next ? next.id : null;
}
