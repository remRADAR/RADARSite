import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/data/projects";

const STYLES: Record<ProjectStatus, string> = {
  "In Production": "bg-flare text-flare-foreground",
  "In Review": "bg-ink text-paper",
  Delivered: "bg-paper text-ink border-2 border-ink",
  "On Hold": "bg-paper text-muted-foreground border-2 border-ink",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest",
        STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
