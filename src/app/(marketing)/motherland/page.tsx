import { IaIndex } from "@/components/marketing/IaPages";
import Image from "next/image";
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
      <section aria-label="MOTHERLand hero" className="relative h-[calc(100svh-3.5rem)] min-h-[20rem] w-full overflow-hidden border-y-2 border-ink bg-ink">
        <Image
          src="/motherland/featured.gif"
          alt="Aerial view of a dense tropical forest surrounding a turquoise lake"
          fill
          sizes="100vw"
          unoptimized
          priority
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
      </section>
      <IaIndex
        eyebrow="(MOTHERLand / Music To Her)"
        title="MOTHERLand"
        intro="Music To Her. Stories, artists, and conversations centered on the women moving culture forward."
        items={motherland}
        basePath="/ontheradar/articles"
      />
    </>
  );
}
