import { StructuredData } from "@/components/StructuredData";
import { breadcrumbStructuredData, webPageStructuredData } from "@/lib/seo";

type ArchiveStructuredDataProps = {
  name: string;
  description: string;
  path: string;
  breadcrumbs: Array<{ name: string; path: string }>;
};

export function ArchiveStructuredData({ name, description, path, breadcrumbs }: ArchiveStructuredDataProps) {
  return (
    <>
      <StructuredData data={webPageStructuredData({ name, description, path, type: "CollectionPage" })} />
      <StructuredData data={breadcrumbStructuredData(breadcrumbs)} />
    </>
  );
}
