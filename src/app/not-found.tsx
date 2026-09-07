import Link from "next/link";

const links = [
  ["RADARMusic", "/radarmusic"],
  ["On The Radar", "/ontheradar"],
  ["About", "/about"],
] as const;

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col justify-between bg-paper px-4 py-6 text-ink md:px-8 md:py-8">
      <Link href="/" className="font-mono text-sm font-bold uppercase tracking-widest">remRADAR</Link>
      <div className="max-w-4xl py-24">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">(404 / Signal lost)</p>
        <h1 className="mt-5 display text-[clamp(4rem,14vw,12rem)] leading-[.8]">Not<br /><span className="text-flare">found.</span></h1>
        <p className="mt-10 max-w-md font-mono text-sm uppercase leading-relaxed tracking-wide">This frequency is not broadcasting. Return to the homepage or tune into another part of the ecosystem.</p>
        <nav className="mt-8 flex flex-wrap gap-3" aria-label="Primary sections">
          <Link href="/" className="brut-border bg-flare px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-flare-foreground">Back home</Link>
          {links.map(([label, href]) => <Link key={href} href={href} className="brut-border px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest">{label}</Link>)}
        </nav>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">© {new Date().getFullYear()} remRADAR</p>
    </main>
  );
}
