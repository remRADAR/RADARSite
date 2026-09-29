import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import { LiveSiteOverrides } from "@/components/LiveSiteOverrides";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { StructuredData, organizationStructuredData } from "@/components/StructuredData";
import { publicSiteUrl, readPublicSiteOverrides, safeSocialImageUrl } from "@/lib/public-site";

const archivo = Archivo({
  variable: "--font-grotesk",
  subsets: ["latin"],
  axes: ["wdth"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await readPublicSiteOverrides();
  const title = settings.socialTitle || settings.seoTitle;
  const description = settings.socialDescription || settings.seoDescription;
  const url = publicSiteUrl();
  const image = safeSocialImageUrl(settings.socialImage);
  return {
    metadataBase: new URL(url),
    title: { default: title, template: "%s | RADARCharts by REM" },
    description,
    alternates: { canonical: "/", languages: { "en-NG": "/", "en-GH": "/", "en-GB": "/", "en-US": "/" } },
    robots: { index: true, follow: true },
    openGraph: { type: "website", locale: "en_NG", siteName: settings.siteName, title, description, url, images: [{ url: image, width: 1200, height: 630, type: "image/svg+xml", alt: settings.siteName }] },
    twitter: { card: "summary_large_image", site: settings.xHandle || "@radarcharts", creator: settings.xHandle || "@radarcharts", title, description, images: [image] },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-flare focus:px-4 focus:py-3 focus:font-mono focus:text-xs focus:font-bold focus:text-flare-foreground">Skip to content</a>
        <StructuredData data={organizationStructuredData} />
        <LiveSiteOverrides />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
