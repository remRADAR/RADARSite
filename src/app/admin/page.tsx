import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminSplitStudio } from "@/components/admin/AdminSplitStudio";
import { MigrationControlPanel } from "@/components/admin/MigrationControlPanel";
export const metadata = { title: "RADAR Studio Control" };
export default function AdminPage() { return <AdminAuthGate><AdminSplitStudio /><MigrationControlPanel /></AdminAuthGate>; }
