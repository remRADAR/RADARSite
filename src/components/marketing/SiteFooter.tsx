import Link from "next/link";
import { Marquee } from "@/components/motion/Marquee";

const NAV = [
  { href: "/work", label: "Work" },
  { href: "/login", label: "Client Login" },
  { href: "mailto:hello@northlight.studio", label: "hello@northlight.studio" },
];

const SOCIALS = [
  { href: "https://instagram.com", label: "IG" },
  { href: "https://linkedin.com", label: "LI" },
  { href: "https://vimeo.com", label: "VM" },
];

export function SiteFooter() {
  return (
    <footer className="on-dark bg-ink text-paper">
      <div className="overflow-hidden border-b-2 border-paper py-6">
        <Marquee durationSeconds={24}>
          <span className="mx-8 display text-[clamp(2.5rem,7vw,6rem)] leading-none">
            Northlight
          </span>
          <span className="mx-8 display text-[clamp(2.5rem,7vw,6rem)] leading-none text-flare">
            ✳
          </span>
        </Marquee>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className="border-b-2 border-paper p-6 md:border-b-0 md:border-r-2 md:p-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            (Index)
          </p>
          <nav className="mt-4 flex flex-col gap-2">
            {NAV.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="w-fit font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:text-flare"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-b-2 border-paper p-6 md:border-b-0 md:border-r-2 md:p-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            (Social)
          </p>
          <div className="mt-4 flex gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="brut-border border-paper px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest transition-colors hover:bg-flare hover:text-flare-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            (Studio)
          </p>
          <p className="mt-4 font-mono text-sm uppercase leading-relaxed tracking-wide">
            Creative agency &amp; production house. Available worldwide, 2026 onward.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t-2 border-paper px-6 py-4 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} Northlight Studio
        </p>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          All rights reserved
        </p>
      </div>
    </footer>
  );
}
