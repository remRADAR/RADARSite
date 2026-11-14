"use client";

import { usePathname } from "next/navigation";
import { MarketingChrome } from "@/components/marketing/MarketingChrome";
import { PlaylistFloater } from "@/components/marketing/PlaylistFloater";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export function MarketingLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPlaylistGallery = pathname === "/radarmusic/artists";

  return (
    <>
      {!isPlaylistGallery && <MarketingChrome />}
      <main id="main-content" className={isPlaylistGallery ? "min-h-0 flex-1" : "flex-1"}>
        {children}
      </main>
      {!isPlaylistGallery && <SiteFooter />}
      {!isPlaylistGallery && <PlaylistFloater />}
    </>
  );
}
