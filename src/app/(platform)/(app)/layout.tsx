import { AppShell } from "@/components/platform/AppShell";
import { BriefsProvider } from "@/lib/briefs-context";

export default function PlatformAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BriefsProvider>
      <AppShell>{children}</AppShell>
    </BriefsProvider>
  );
}
