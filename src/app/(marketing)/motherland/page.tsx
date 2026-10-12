import { IaIndex } from "@/components/marketing/IaPages";
import { StructuredData } from "@/components/StructuredData";
import { readPublishedContent } from "@/lib/content-server";
import { recordsForProject } from "@/lib/editorial-archives";
import { breadcrumbStructuredData, buildPageMetadata, webPageStructuredData } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "MOTHERLand",
  description: "Music To Her. Stories, artists, and conversations centered on the women moving culture forward.",
  path: "/motherland",
  image: "/motherland/featured.gif",
});

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
