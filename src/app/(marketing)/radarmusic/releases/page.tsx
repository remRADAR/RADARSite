import { IaIndex } from "@/components/marketing/IaPages";
import { releases } from "@/lib/ia-content";
export default function ReleasesPage() { return <IaIndex eyebrow="(RADARMusic / Releases)" title="Releases" intro="Records, worlds, and the stories that start when the track begins." items={releases} basePath="/radarmusic/releases" />; }
