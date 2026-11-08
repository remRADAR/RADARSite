"use client";

import { useEffect, useState } from "react";

type CountdownValue = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
};

const ZERO: CountdownValue = { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false };

function getRemaining(targetMs: number, nowMs = Date.now()): CountdownValue {
  const totalSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    isLive: nowMs >= targetMs,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function EventCountdown({ targetIso }: { targetIso: string }) {
  const targetMs = Date.parse(targetIso);
  const [remaining, setRemaining] = useState<CountdownValue>(ZERO);

  useEffect(() => {
    const update = () => setRemaining(getRemaining(targetMs));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [targetMs]);

  const units = [
    [remaining.days, "Days"],
    [remaining.hours, "Hours"],
    [remaining.minutes, "Minutes"],
    [remaining.seconds, "Seconds"],
  ] as const;

  return (
    <section className="mt-8 border-2 border-ink bg-ink p-5 text-paper md:p-8" aria-labelledby="countdown-heading" data-countdown data-countdown-target={targetIso}>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-paper/30 pb-5">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-flare">The clock is running</p>
          <h2 id="countdown-heading" className="mt-2 display text-3xl leading-none md:text-5xl">{remaining.isLive ? "We are live." : "Until the doors open."}</h2>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-paper/60">Abuja / WAT</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-paper/30 pt-5 sm:grid-cols-4" aria-live="polite" aria-atomic="true">
        {units.map(([value, label]) => (
          <div key={label} className="bg-ink pr-3 pt-1 first:pl-0 sm:pl-4">
            <p className="font-mono text-[clamp(2rem,7vw,5rem)] font-bold leading-none tabular-nums text-flare">{pad(value)}</p>
            <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-paper/60">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
