import { StructuredData } from "@/components/StructuredData";
import { FadeIn } from "@/components/motion/FadeIn";
import { FrameRail } from "@/components/legends/zumzy-brown/FrameRail";
import { LegendHero } from "@/components/legends/zumzy-brown/LegendHero";
import { SoundFrame } from "@/components/legends/zumzy-brown/SoundFrame";
import { LegacyFrame } from "@/components/legends/zumzy-brown/LegacyFrame";
import { absoluteUrl, breadcrumbStructuredData, buildPageMetadata, webPageStructuredData } from "@/lib/seo";
import { zumzyIdentity } from "@/data/zumzy-brown";

export const revalidate = 3600;

const PAGE_PATH = "/legends/zumzy-brown";

export const metadata = buildPageMetadata({
  title: "LEGEND FOREVER — Zumzy Brown",
  description:
    "A life. A sound. A legacy. The Zumzy Brown digital monument — his verified catalogue, timeline, and remembrance, by RADARCharts by REM.",
  path: PAGE_PATH,
});

/** Structured data limited to verified facts: the artist's public identity and official profiles. */
function zumzyMusicGroupStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: zumzyIdentity.name,
    url: absoluteUrl(PAGE_PATH),
    birthDate: zumzyIdentity.born,
    deathDate: zumzyIdentity.died,
    sameAs: [
      "https://open.spotify.com/artist/1jrvXX5OrCqoqvOa2ypTF1",
      "https://music.apple.com/us/artist/zumzy-brown/1495998309",
      "https://www.deezer.com/us/artist/84162502",
      "https://soundcloud.com/zumzy-brown",
    ],
  };
}

export default function ZumzyBrownLegendPage() {
  return (
    <>
      <StructuredData data={webPageStructuredData({ name: "LEGEND FOREVER — Zumzy Brown", description: "A life. A sound. A legacy. The Zumzy Brown digital monument.", path: PAGE_PATH, type: "ProfilePage" })} />
      <StructuredData data={breadcrumbStructuredData([{ name: "Home", path: "/" }, { name: "Legends", path: "/legends" }, { name: "Zumzy Brown", path: PAGE_PATH }])} />
      <StructuredData data={zumzyMusicGroupStructuredData()} />

      <FrameRail />
      <FadeIn>
        <LegendHero />
      </FadeIn>
      <SoundFrame />
      <LegacyFrame />
    </>
  );
}
