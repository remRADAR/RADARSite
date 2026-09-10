type StructuredDataProps = { data: Record<string, unknown> };

export function StructuredData({ data }: StructuredDataProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "RADARCharts by REM",
  url: "https://radarcharts.net",
  logo: { "@type": "ImageObject", url: "https://radarcharts.net/radar-logo.webp", width: 600, height: 60 },
  sameAs: ["https://www.instagram.com/remradar/", "https://x.com/RADARCharts", "https://www.youtube.com/@remradar"],
};
