import { IaIndex } from "@/components/marketing/IaPages";
import { readPublishedContent } from "@/lib/content-server";
import { deriveEditorialTaxonomy } from "@/lib/cms-taxonomy";

export const revalidate = 3600;

export default async function MotherlandPage() {
  const { articles } = await readPublishedContent();
  const motherland = articles.filter((article) => deriveEditorialTaxonomy(article).projectSection === "Motherland" || article.categories?.some((category) => /motherland/i.test(category)));
  return (
    <IaIndex
      eyebrow="(MOTHERLand / Music To Her)"
      title="MOTHERLand"
      intro="Music To Her. Stories, artists, and conversations centered on the women moving culture forward."
      items={motherland}
      basePath="/ontheradar/articles"
    />
  );
}
