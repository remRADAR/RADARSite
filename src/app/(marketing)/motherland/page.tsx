import { IaIndex } from "@/components/marketing/IaPages";
import { articles } from "@/lib/ia-content";
import type { Metadata } from "next";
import { publicSiteUrl, readPublicSiteOverrides, safeSocialImageUrl } from "@/lib/public-site";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbStructuredData, collectionPageStructuredData } from "@/lib/seo-schema";

const description = "MOTHERLand — Music To Her. Stories, artists, and conversations centered on the women moving culture forward.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readPublicSiteOverrides();
  const image = safeSocialImageUrl(settings.socialImage);
  return { title: "MOTHERLand", description, alternates: { canonical: "/motherland" }, openGraph: { type: "website", url: `${publicSiteUrl()}/motherland`, siteName: settings.siteName, title: "MOTHERLand", description, images: [{ url: image, alt: "MOTHERLand" }] }, twitter: { card: "summary_large_image", site: settings.xHandle, title: "MOTHERLand", description, images: [image] } };
}

export default function MotherlandPage() {
  return (
    <><StructuredData data={collectionPageStructuredData({ name: "MOTHERLand", description, canonicalUrl: "/motherland", about: "MOTHERLand" })} /><StructuredData data={breadcrumbStructuredData([{ name: "RADARCharts", url: "/" }, { name: "MOTHERLand", url: "/motherland" }])} /><IaIndex
      eyebrow="(MOTHERLand / Music To Her)"
      title="MOTHERLand"
      intro="Music To Her. Stories, artists, and conversations centered on the women moving culture forward."
      items={articles.filter((article) => article.categories?.includes("Motherland"))}
      basePath="/ontheradar/articles"
    /></>
  );
}
