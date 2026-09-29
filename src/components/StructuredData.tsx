import { publicSiteUrl } from "@/lib/public-site";
import { defaultSiteOverrides } from "@/lib/site-overrides";

type StructuredDataProps = { data: Record<string, unknown> };

export function StructuredData({ data }: StructuredDataProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RADARCharts by REM",
  url: publicSiteUrl(),
  logo: { "@type": "ImageObject", url: `${publicSiteUrl()}/radar-logo.webp`, width: 600, height: 60 },
  sameAs: defaultSiteOverrides.socialLinks.filter((link) => link.enabled).map((link) => link.href),
};
