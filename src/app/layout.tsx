import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import { LiveSiteOverrides } from "@/components/LiveSiteOverrides";

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
  title: {
    default: "RADARCharts — Put it on the RADAR",
    template: "%s — RADARCharts",
  },
  description:
    "RADARCharts is a music ecosystem for artists, releases, stories, and the people moving culture forward.",
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
        <LiveSiteOverrides />
        {children}
      </body>
    </html>
  );
}
