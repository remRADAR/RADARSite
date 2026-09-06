export type BriefStatus = "Draft" | "Submitted" | "In Review";
export type Brief = { id: string; title: string; projectType: string; budgetRange: string; timeline: string; details: string; submittedAt: string; status: BriefStatus };

export const initialBriefs: Brief[] = [
  { id: "brief-luna-vale", title: "Luna Vale — debut EP world", projectType: "Artist development", budgetRange: "£25k–£50k", timeline: "Q3 2026", details: "Identity, visual world, live session, and release campaign.", submittedAt: "2026-07-18", status: "In Review" },
  { id: "brief-radar-live", title: "RADAR Live — winter sessions", projectType: "Live + editorial", budgetRange: "£50k–£100k", timeline: "Q4 2026", details: "The second season of the RADAR Sessions editorial and live series.", submittedAt: "2026-08-04", status: "Submitted" },
  { id: "brief-north-star", title: "North Star — release extension", projectType: "Release campaign", budgetRange: "£10k–£25k", timeline: "Q2 2026", details: "A tactile album campaign across physical, outdoor, and editorial channels.", submittedAt: "2026-06-02", status: "Draft" },
];

export const briefs = initialBriefs;
