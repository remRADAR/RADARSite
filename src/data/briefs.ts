export type BriefStatus = "Draft" | "Submitted" | "In Review" | "Approved";

export type Brief = {
  id: string;
  title: string;
  projectType: string;
  budgetRange: string;
  timeline: string;
  details: string;
  status: BriefStatus;
  submittedAt: string;
};

export const initialBriefs: Brief[] = [
  {
    id: "brf-1042",
    title: "Halcyon — Holiday Capsule Packaging",
    projectType: "Packaging",
    budgetRange: "$40k–$75k",
    timeline: "8–10 weeks",
    details: "Limited holiday capsule building on the core relaunch system, three SKUs.",
    status: "In Review",
    submittedAt: "2026-06-18",
  },
  {
    id: "brf-1038",
    title: "Vantage — Owner Onboarding Film",
    projectType: "Film",
    budgetRange: "$75k–$150k",
    timeline: "12 weeks",
    details: "Short film shown to new owners at delivery, walking through key features.",
    status: "Approved",
    submittedAt: "2026-05-30",
  },
  {
    id: "brf-1029",
    title: "Kestrel — Wholesale Line Sheet Redesign",
    projectType: "Print / Digital",
    budgetRange: "$15k–$30k",
    timeline: "4 weeks",
    details: "Refresh the wholesale line sheet system ahead of SS27 buying season.",
    status: "Submitted",
    submittedAt: "2026-06-02",
  },
];
