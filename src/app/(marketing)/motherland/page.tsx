import type { Metadata } from "next";
import { IaIndex } from "@/components/marketing/IaPages";
import { StructuredData } from "@/components/StructuredData";
import { readPublishedContent } from "@/lib/content-server";
import { recordsForProject } from "@/lib/editorial-archives";
import { breadcrumbStructuredData, webPageStructuredData } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "MOTHERLand | RADARCharts",
  description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.",
  openGraph: {
    title: "MOTHERLand | RADARCharts",
    description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.",
    images: [{ url: "/motherland/featured.gif", alt: "MOTHERLand featured artwork" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MOTHERLand | RADARCharts",
    description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.",
    images: ["/motherland/featured.gif"],
  },
};

export default async function MotherlandPage() {
  const { articles } = await readPublishedContent();
  const motherland = recordsForProject(articles);

  return (
    <>
      <StructuredData data={webPageStructuredData({ name: "MOTHERLand", description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.", path: "/motherland", type: "CollectionPage" })} />
      <StructuredData data={breadcrumbStructuredData([{ name: "Home", path: "/" }, { name: "MOTHERLand", path: "/motherland" }])} />
      <IaIndex
        eyebrow="(MOTHERLand / Music To Her)"
        title="MOTHERLand"
        intro="Music To Her. Stories, artists, and conversations centered on the women moving culture forward."
        items={motherland}
        basePath="/ontheradar/articles"
        featuredImage="/motherland/featured.gif"
      />
    </>
  );
}
