import { cn } from "@/lib/utils";

type MarqueeProps = {
  children: React.ReactNode;
  reverse?: boolean;
  durationSeconds?: number;
  className?: string;
  /** Repeat the content N times per copy to fill wide viewports. */
  repeat?: number;
};

/**
 * Infinite horizontal ticker — pure CSS (two duplicated copies looping via
 * translateX -50%). Reliable, GPU-cheap, and pauses under reduced-motion
 * (handled in globals.css). Used as brutalist section dividers.
 */
export function Marquee({
  children,
  reverse,
  durationSeconds = 22,
  className,
  repeat = 4,
}: MarqueeProps) {
  const copy = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {Array.from({ length: repeat }).map((_, i) => (
        <div key={i} className="flex shrink-0 items-center">
          {children}
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("flex w-full overflow-hidden", className)}>
      <div
        className={cn("flex w-max", reverse ? "animate-marquee-reverse" : "animate-marquee")}
        style={{ ["--marquee-duration" as string]: `${durationSeconds}s` }}
      >
        {copy}
        {copy}
      </div>
    </div>
  );
}
