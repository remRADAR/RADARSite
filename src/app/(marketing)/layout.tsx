import { SiteFooter } from "@/components/marketing/SiteFooter";
import { MarketingChrome } from "@/components/marketing/MarketingChrome";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { CursorProvider } from "@/components/motion/CursorProvider";
import { PlaylistFloater } from "@/components/marketing/PlaylistFloater";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CursorProvider>
      <SmoothScrollProvider>
        <MarketingChrome />
        <main id="main-content" className="flex-1">{children}</main>
        <SiteFooter />
        <PlaylistFloater />
      </SmoothScrollProvider>
    </CursorProvider>
  );
}
