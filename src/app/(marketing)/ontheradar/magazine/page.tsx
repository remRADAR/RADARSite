import Link from "next/link";
import { StructuredData } from "@/components/StructuredData";
import { MagazineArchiveSection } from "@/components/marketing/MagazineExperience";
import { readPublishedContent } from "@/lib/content-server";
import { recordsForMagazineSubtype } from "@/lib/editorial-archives";
import { breadcrumbStructuredData, buildPageMetadata, webPageStructuredData } from "@/lib/seo";

export const revalidate = 3600;
export const metadata = buildPageMetadata({ title: "Magazine", description: "Special Episodes and Magazine Episodes from the RADARCharts editorial ecosystem.", path: "/ontheradar/magazine" });

export default async function MagazinePage() {
  const { articles, magazine } = await readPublishedContent();
  const specialEpisodes = recordsForMagazineSubtype(articles, "Special Episode");
  const magazineEpisodes = recordsForMagazineSubtype(articles, "Magazine Episode");

  return (
    <>
      <StructuredData data={webPageStructuredData({ name: "Magazine", description: "A separate editorial lane for Special Episodes and Magazine Episodes.", path: "/ontheradar/magazine", type: "CollectionPage" })} />
      <StructuredData data={breadcrumbStructuredData([{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "Magazine", path: "/ontheradar/magazine" }])} />
      <div>
        <section className="border-b-2 border-ink px-4 pb-10 pt-24 md:px-8">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(On The Radar / Magazine)</p>
          <h1 className="mt-4 display text-[clamp(3rem,11vw,11rem)] leading-[.84]">Magazine<span className="text-flare">.</span></h1>
          <p className="mt-8 max-w-2xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">A separate editorial lane for Special Episodes and Magazine Episodes. Magazine entries retain one canonical article identity and do not appear in Press or Spotlight.</p>
          <div className="mt-8 flex flex-wrap gap-4 font-mono text-xs font-bold uppercase tracking-widest">
            <Link className="text-flare hover:underline" href="#special-episodes">Special Episodes ({specialEpisodes.length})</Link>
            <Link className="text-flare hover:underline" href="#magazine-episodes">Magazine Episodes ({magazineEpisodes.length})</Link>
          </div>
        </section>
        {magazine.length > 0 ? <section className="px-4 py-12 md:px-8"><MagazineArchiveSection eyebrow="(Magazine / Featured)" title="Featured" intro="Legacy standalone Magazine content remains discoverable here while its subtype metadata is reviewed." items={magazine} tone="cool" /></section> : null}
        <div className="space-y-14 px-4 py-14 md:px-8 md:py-20">
          <section id="special-episodes" className="scroll-mt-24"><MagazineArchiveSection eyebrow="(Magazine / Special Episode)" title="Special Episodes" intro="Long-form special guest episodes from the canonical Magazine taxonomy." items={specialEpisodes} tone="flare" /></section>
          <section id="magazine-episodes" className="scroll-mt-24"><MagazineArchiveSection eyebrow="(Magazine / Magazine Episode)" title="Magazine Episodes" intro="The regular Magazine Episode lane, separate from Press and Spotlight." items={magazineEpisodes} tone="cool" /></section>
        </div>
      </div>
    </>
  );
}
