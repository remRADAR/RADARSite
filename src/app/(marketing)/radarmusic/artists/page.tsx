import { IaIndex } from "@/components/marketing/IaPages";
import { artists } from "@/lib/ia-content";
export default function ArtistsPage() { return <IaIndex eyebrow="(RADARMusic / Artists)" title="Artists" intro="The people carrying the signal forward." items={artists} basePath="/radarmusic/artists" />; }
