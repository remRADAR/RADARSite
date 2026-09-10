import { IaIndex } from "@/components/marketing/IaPages";
import { articles } from "@/lib/ia-content";

export default function MotherlandPage() {
  return (
    <IaIndex
      eyebrow="(MOTHERLand / Music To Her)"
      title="MOTHERLand"
      intro="Music To Her. Stories, artists, and conversations centered on the women moving culture forward."
      items={articles.filter((article) => article.categories?.includes("Motherland"))}
      basePath="/ontheradar/articles"
    />
  );
}
