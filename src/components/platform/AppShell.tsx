"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", index: "01" },
  { href: "/projects", label: "Projects", index: "02" },
  { href: "/briefs", label: "Briefs", index: "03" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 shrink-0 flex-col border-r-2 border-ink bg-paper md:flex">
        <Link href="/dashboard" className="group/logo flex h-16 items-center gap-3 border-b-2 border-ink px-6">
          <LogoMark />
          <span className="display text-lg">Northlight</span>
        </Link>
        <p className="border-b-2 border-ink px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Client Portal
        </p>
        <nav className="flex flex-1 flex-col">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 border-b-2 border-ink px-6 py-4 font-mono text-xs font-bold uppercase tracking-widest transition-colors",
                  active ? "bg-flare text-flare-foreground" : "hover:bg-ink hover:text-paper"
                )}
              >
                <span className={active ? "text-flare-foreground" : "text-muted-foreground"}>
                  {item.index}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t-2 border-ink p-4">
          <Link
            href="/login"
            className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-flare"
          >
            → Sign out
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b-2 border-ink bg-paper px-6">
          <Link href="/dashboard" className="display text-lg md:hidden">
            Northlight
          </Link>
          <nav className="flex gap-4 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[11px] font-bold uppercase tracking-widest"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Priya Nair
            </span>
            <div className="flex size-9 items-center justify-center bg-ink font-mono text-xs font-bold text-paper">
              PN
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
