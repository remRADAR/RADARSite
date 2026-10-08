import { IaIndex } from "@/components/marketing/IaPages";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { artists } from "@/lib/ia-content";
export default function ArtistsPage() { return <><ArchiveStructuredData name="Artists" description="The people carrying the signal forward." path="/radarmusic/artists" breadcrumbs={[{ name: "Home", path: "/" }, { name: "RADARMusic", path: "/radarmusic" }, { name: "Artists", path: "/radarmusic/artists" }]} /><IaIndex eyebrow="(RADARMusic / Artists)" title="Artists" intro="The people carrying the signal forward." items={artists} basePath="/radarmusic/artists" /></>; }
