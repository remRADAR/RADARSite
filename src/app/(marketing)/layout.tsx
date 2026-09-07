import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { CursorProvider } from "@/components/motion/CursorProvider";
import { RADARME_URL } from "@/lib/ia-content";

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
        <a href={RADARME_URL} target="_blank" rel="noreferrer" className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-center border-2 border-ink bg-flare px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground shadow-[4px_4px_0_0_var(--ink)] md:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          Connect with RADARMe ↗
        </a>
      </SmoothScrollProvider>
    </CursorProvider>
  );
}
