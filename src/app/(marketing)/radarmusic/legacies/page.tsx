import type { Metadata } from "next";
import { RadarPlaylistsExperience } from "@/components/marketing/RadarPlaylistsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Legacies",
  description: "The foundational records and the people who set the RADAR signal in motion, curated by RADARCharts.",
  path: "/radarmusic/legacies",
});

// Moon orbit fallback: shared playlist pod. Passes source="legacies" so the
// pod labels itself as the legacies signal while the dedicated legacies
// catalog is integrated into the pod (TEMPORARY shared pod, like editorial
// and curated).
export default function LegaciesPlaylistsPage() {
  return <RadarPlaylistsExperience source="legacies" />;
}
