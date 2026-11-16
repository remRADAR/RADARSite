import { StructuredData } from "@/components/StructuredData";
import { MagazineIndex } from "@/components/marketing/MagazineIndex";
import { readPublishedContent } from "@/lib/content-server";
import { recordsForMagazineSubtype } from "@/lib/editorial-archives";
import { breadcrumbStructuredData, buildPageMetadata, webPageStructuredData } from "@/lib/seo";
export const revalidate = 3600;
export const metadata = buildPageMetadata({ title: "Magazine", description: "Special Episodes and Magazine Episodes from the RADARCharts editorial ecosystem, each read as a flipbook issue.", path: "/ontheradar/magazine" });
export default async function MagazinePage() {
  const { articles, magazine } = await readPublishedContent();
  const specialEpisodes = recordsForMagazineSubtype(articles, "Special Episode");
  const magazineEpisodes = recordsForMagazineSubtype(articles, "Magazine Episode");
  // The newest issue leads the page; the rest follow in their canonical lanes.
  const lead = specialEpisodes[0] || magazineEpisodes[0] || magazine[0];
  const leadSlug = lead?.slug;
  const withoutLead = <T extends { slug: string }>(items: T[]) => (leadSlug ? items.filter((item) => item.slug !== leadSlug) : items);
  return (
    <>
      <StructuredData data={webPageStructuredData({ name: "Magazine", description: "A separate editorial lane for Special Episodes and Magazine Episodes, presented as flipbook issues.", path: "/ontheradar/magazine", type: "CollectionPage" })} />
      <StructuredData data={breadcrumbStructuredData([{ name: "Home", path: "/" }, { name: "On The Radar", path: "/ontheradar" }, { name: "Magazine", path: "/ontheradar/magazine" }])} />
      <MagazineIndex lead={lead} specialEpisodes={withoutLead(specialEpisodes)} magazineEpisodes={withoutLead(magazineEpisodes)} legacy={withoutLead(magazine)} />
    </>
  );
}
