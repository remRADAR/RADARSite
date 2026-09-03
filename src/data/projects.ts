export type ProjectStatus = "In Production" | "In Review" | "Delivered" | "On Hold";

export type Milestone = {
  label: string;
  date: string;
  done: boolean;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  deadline: string;
  mainContact: string;
  summary: string;
  milestones: Milestone[];
  deliverables: string[];
};

export const projects: Project[] = [
  {
    id: "halcyon-relaunch",
    name: "Halcyon Relaunch",
    client: "Halcyon Distilling Co.",
    status: "In Production",
    progress: 68,
    deadline: "2026-09-12",
    mainContact: "Priya Nair",
    summary:
      "Full identity, packaging, and launch film for Halcyon's six-SKU relaunch across 12 markets.",
    milestones: [
      { label: "Discovery & audit", date: "2026-04-02", done: true },
      { label: "Identity system approved", date: "2026-05-20", done: true },
      { label: "Packaging production", date: "2026-07-15", done: true },
      { label: "Launch film — rough cut", date: "2026-08-01", done: false },
      { label: "Retail toolkit delivery", date: "2026-09-12", done: false },
    ],
    deliverables: ["Brand guidelines", "6 SKU packaging files", "90s launch film", "Retail toolkit"],
  },
  {
    id: "vantage-tour",
    name: "Vantage 14-City Tour",
    client: "Vantage Motors",
    status: "In Review",
    progress: 82,
    deadline: "2026-08-05",
    mainContact: "Devon Marsh",
    summary: "Driving tour build-out and campaign film supporting the Vantage direct-to-driver launch.",
    milestones: [
      { label: "Route + venue confirmation", date: "2026-05-10", done: true },
      { label: "Campaign film — final cut", date: "2026-07-01", done: true },
      { label: "Tour signage production", date: "2026-07-20", done: true },
      { label: "Client sign-off", date: "2026-08-05", done: false },
    ],
    deliverables: ["Campaign film", "Tour signage system", "Press kit"],
  },
  {
    id: "kestrel-ss27",
    name: "Kestrel SS27 Campaign",
    client: "Kestrel",
    status: "On Hold",
    progress: 24,
    deadline: "2026-11-01",
    mainContact: "Sam Okafor",
    summary: "Field-shot campaign for Kestrel's Spring/Summer 2027 technical outerwear line.",
    milestones: [
      { label: "Route scouting", date: "2026-06-01", done: true },
      { label: "Shot list approval", date: "2026-06-25", done: false },
      { label: "Field shoot, route A", date: "2026-08-10", done: false },
    ],
    deliverables: ["Image library", "Retail window program", "Wholesale toolkit"],
  },
  {
    id: "meridian-brand-refresh",
    name: "Meridian Brand Refresh",
    client: "Meridian Financial",
    status: "Delivered",
    progress: 100,
    deadline: "2026-03-01",
    mainContact: "Lena Ostrow",
    summary: "Light-touch identity refresh and updated brand guidelines for Meridian's retail division.",
    milestones: [
      { label: "Audit & workshops", date: "2026-01-05", done: true },
      { label: "Guidelines delivered", date: "2026-02-20", done: true },
      { label: "Rollout support", date: "2026-03-01", done: true },
    ],
    deliverables: ["Brand guidelines", "Rollout deck"],
  },
];

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}
