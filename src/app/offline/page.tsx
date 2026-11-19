import Link from "next/link";

export const metadata = {
  title: "RADAR is offline",
  description: "RADARCharts is waiting for the connection to return.",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl border-2 border-ink p-7 sm:p-12" aria-labelledby="offline-title">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          RADARCharts / Signal paused
        </p>
        <h1 id="offline-title" className="mt-5 display text-5xl leading-[0.9] sm:text-7xl">
          The signal will return.
        </h1>
        <p className="mt-7 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-wide text-muted-foreground">
          This installed web app could not reach the live RADAR origin. Reconnect to refresh stories,
          releases, and projects from the official source.
        </p>
        <Link
          href="/"
          className="mt-9 inline-flex min-h-12 items-center border-2 border-ink px-5 font-mono text-xs font-bold uppercase tracking-[0.16em] transition-colors hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-flare"
        >
          Try again
        </Link>
      </section>
    </main>
  );
}
