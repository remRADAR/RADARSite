import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
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
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <PlaylistFloater />
      </SmoothScrollProvider>
    </CursorProvider>
  );
}
