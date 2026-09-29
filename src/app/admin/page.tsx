import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { CmsStudioPanel } from "@/components/admin/CmsStudioPanel";
import { AdminSplitStudio } from "@/components/admin/AdminSplitStudio";
import { MigrationControlPanel } from "@/components/admin/MigrationControlPanel";

export const metadata = { title: "RADAR Studio CMS" };

export default function AdminPage() {
  return <AdminAuthGate><CmsStudioPanel /><details className="border-t border-neutral-800 bg-neutral-950 text-neutral-100"><summary className="cursor-pointer px-5 py-5 font-mono text-xs uppercase tracking-widest text-neutral-400 sm:px-8">Open site composition controls</summary><AdminSplitStudio /></details><MigrationControlPanel /></AdminAuthGate>;
}
