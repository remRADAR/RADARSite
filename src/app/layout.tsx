import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import { LiveSiteOverrides } from "@/components/LiveSiteOverrides";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { StructuredData, organizationStructuredData } from "@/components/StructuredData";

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
  metadataBase: new URL("https://radarcharts.net"),
  title: {
    default: "RADARCharts by REM",
    template: "%s | RADARCharts by REM",
  },
  description: "RADARCharts by REM is a Nigerian and African music discovery, media, culture, artist-development, and intelligence platform.",
  alternates: { canonical: "/", languages: { "en-NG": "/", "en-GH": "/", "en-GB": "/", "en-US": "/" } },
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "en_NG", siteName: "RADARCharts by REM", title: "RADARCharts by REM", description: "A Nigerian and African music discovery, media, culture, artist-development, and intelligence platform.", url: "https://radarcharts.net" },
  twitter: { card: "summary_large_image", site: "@radarcharts", creator: "@radarcharts" },
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
        <LiveSiteOverrides />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
