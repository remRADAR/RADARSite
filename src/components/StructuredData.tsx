import { serializeJsonLd } from "@/lib/article-schema";
import { websiteStructuredData } from "@/lib/seo";

type StructuredDataProps = { data: Record<string, unknown> };

export function StructuredData({ data }: StructuredDataProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RADARCharts by REM",
  url: "https://radarcharts.net",
  logo: { "@type": "ImageObject", url: "https://radarcharts.net/radar-logo.webp", width: 600, height: 60 },
  sameAs: ["https://www.instagram.com/remradar/", "https://x.com/RADARCharts", "https://www.youtube.com/@remradar"],
};
export const websiteStructuredDataGraph = websiteStructuredData();
