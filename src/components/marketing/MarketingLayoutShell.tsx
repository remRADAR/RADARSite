"use client";

import { MarketingChrome } from "@/components/marketing/MarketingChrome";
import { PlaylistFloater } from "@/components/marketing/PlaylistFloater";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export function MarketingLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingChrome />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <PlaylistFloater />
    </>
  );
}
