"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("RADAR application error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-paper px-6 py-24 text-ink">
      <section className="max-w-xl border-2 border-ink p-6 md:p-10">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">(System pause)</p>
        <h1 className="display mt-5 text-5xl md:text-7xl">Signal interrupted.</h1>
        <p className="mt-6 max-w-md font-mono text-sm leading-relaxed">Something went wrong while loading this view. Try again, or return to the RADAR home signal.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => reset()} className="border-2 border-ink bg-ink px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest text-paper hover:bg-flare hover:text-flare-foreground">Try again</button>
          <Link href="/" className="border-2 border-ink px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest hover:bg-flare hover:text-flare-foreground">Return home</Link>
        </div>
      </section>
    </main>
  );
}
