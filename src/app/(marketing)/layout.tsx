import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";
import { CursorProvider } from "@/components/motion/CursorProvider";
import { MarketingLayoutShell } from "@/components/marketing/MarketingLayoutShell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CursorProvider>
      <SmoothScrollProvider>
        <MarketingLayoutShell>{children}</MarketingLayoutShell>
      </SmoothScrollProvider>
    </CursorProvider>
  );
}
