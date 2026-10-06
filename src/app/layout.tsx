import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import { LiveSiteOverrides } from "@/components/LiveSiteOverrides";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { StructuredData, organizationStructuredData, websiteStructuredDataGraph } from "@/components/StructuredData";
import { DEFAULT_SOCIAL_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/", languages: { "en-NG": "/", "en-GH": "/", "en-GB": "/", "en-US": "/" } },
  robots: { index: true, follow: true },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
  openGraph: { type: "website", locale: "en_NG", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, url: SITE_URL, images: [{ url: `${SITE_URL}${DEFAULT_SOCIAL_IMAGE}`, width: 1200, height: 675, type: "image/jpeg", alt: "RADARCharts city and stadium scene" }] },
  twitter: { card: "summary_large_image", site: "@radarcharts", creator: "@radarcharts", images: [`${SITE_URL}${DEFAULT_SOCIAL_IMAGE}`] },
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
        <StructuredData data={websiteStructuredDataGraph} />
        <LiveSiteOverrides />
        <ServiceWorkerRegistration />
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
