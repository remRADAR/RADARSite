"use client";

import Link from "next/link";
import { Magnetic } from "@/components/motion/Magnetic";
import { Logo } from "@/components/Logo";

const NAV_LINKS = [
  { href: "/work", label: "Work", index: "01" },
  { href: "mailto:hello@northlight.studio", label: "Contact", index: "02" },
  { href: "/login", label: "Client", index: "03" },
];

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 brut-border-b bg-paper">
      <div className="flex h-14 items-stretch justify-between">
        <Logo className="border-r-2 border-ink px-4 md:px-6" />

        <div className="hidden items-center border-l-2 border-ink px-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground md:flex">
          [ Est. 2026 — Worldwide ]
        </div>

        <nav className="flex items-stretch">
          {NAV_LINKS.map((link) => (
            <Magnetic key={link.href} strength={0.3} className="flex">
              <Link
                href={link.href}
                className="group flex items-center gap-2 border-l-2 border-ink px-4 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-flare hover:text-flare-foreground md:px-6"
              >
                <span className="text-muted-foreground group-hover:text-flare-foreground">
                  {link.index}
                </span>
                {link.label}
              </Link>
            </Magnetic>
          ))}
        </nav>
      </div>
    </header>
  );
}
