import type { Metadata } from "next";
import { RadarChartsExperience } from "@/components/marketing/RadarChartsExperience";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Charts",
  description: "Top 100 Abuja, counted with grillhype. The RADARMusic charts, one pod player: the city records ranked, weekly.",
  path: "/radarmusic/charts",
});

// Moon orbit fallback: the charts page. The hero switches between the
// charts data set in RadarChartsExperience; the pod follows the active
// chart. Charts and Podcast are different pages on purpose.
export default function RadarChartsPage() {
  return <RadarChartsExperience />;
}
