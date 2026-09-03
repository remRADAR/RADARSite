"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { EASE, DURATION } from "@/lib/motion";
import { MediaFrame } from "@/components/MediaFrame";
import type { CaseStudy } from "@/lib/case-studies";
import type { UnsplashPhoto } from "@/lib/unsplash";

export function CaseHero({ project, photo }: { project: CaseStudy; photo?: UnsplashPhoto | null }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const lines = root.querySelectorAll<HTMLElement>("[data-case-line]");
    const media = root.querySelector<HTMLElement>("[data-case-media]");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      gsap.set([...Array.from(lines), media].filter(Boolean) as HTMLElement[], { clearProps: "all" });
      return;
    }

    const tl = gsap.timeline({ delay: 0.5, defaults: { ease: EASE.slam } });
    tl.set(lines, { clipPath: "inset(0 0 100% 0)", yPercent: 14 })
      .set(media, { clipPath: "inset(100% 0 0 0)" })
      .to(lines, { clipPath: "inset(0 0 0% 0)", yPercent: 0, duration: 0.9, stagger: 0.1 })
      .to(media, { clipPath: "inset(0% 0 0 0)", duration: DURATION.cinematic }, "-=0.4");

    return () => {
      tl.kill();
    };
  }, []);

  const meta = [
    { label: "Role", value: project.role },
    { label: "Year", value: project.year },
    { label: "Scope", value: project.scope },
    { label: "Deliverables", value: project.deliverables },
  ];

  return (
    <div ref={rootRef} className="pt-14">
      <div className="flex items-center justify-between px-4 py-5 md:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-widest">
          {project.client}
        </p>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Case / {project.year}
        </p>
      </div>

      <div className="brut-border-t px-4 py-10 md:px-8 md:py-14">
        <h1 className="display text-[clamp(2.5rem,8vw,8rem)] text-ink">
          {project.title.split(" ").reduce<string[][]>((rows, word, i) => {
            const row = Math.floor(i / 4);
            (rows[row] ??= []).push(word);
            return rows;
          }, []).map((words, i) => (
            <span key={i} className="block overflow-hidden">
              <span data-case-line className="block">
                {words.join(" ")}{" "}
              </span>
            </span>
          ))}
        </h1>
      </div>

      <dl className="grid grid-cols-2 brut-border-t md:grid-cols-4">
        {meta.map((m, i) => (
          <div
            key={m.label}
            className={cnMeta(i)}
          >
            <dt className="font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {m.label}
            </dt>
            <dd className="mt-2 font-mono text-sm uppercase tracking-wide">{m.value}</dd>
          </div>
        ))}
      </dl>

      <div data-case-media className="brut-border-t">
        <MediaFrame
          tone={project.heroTone}
          aspect="aspect-[16/9] md:aspect-[21/9]"
          className="w-full"
          grain
          photo={photo}
          sizes="100vw"
          priority
          attribution={false}
        />
      </div>
    </div>
  );
}

function cnMeta(i: number) {
  const base = "p-4 md:p-6 border-ink";
  const borders = [
    "border-b-2 border-r-2 md:border-b-0",
    "border-b-2 md:border-b-0 md:border-r-2",
    "border-r-2",
    "",
  ];
  return `${base} ${borders[i] ?? ""}`;
}
