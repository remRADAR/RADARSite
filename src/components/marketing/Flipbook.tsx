"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MagazineContentEntry, MagazinePage } from "@/lib/magazine-pages";
import styles from "./Flipbook.module.css";

export type FlipbookProps = {
  pages: MagazinePage[];
  contents: MagazineContentEntry[];
  title: string;
  subtitle?: string;
  issueLabel: string;
  backPath: string;
  backLabel?: string;
  /** Rendered on the back cover as the colophon line. */
  colophon?: string;
};

const FLIP_MS = 1000;
const MOBILE_BREAKPOINT = 820;
const PAGE_RATIO = 0.715;

function pad(value: number) {
  return (value < 10 ? "0" : "") + value;
}

/**
 * Flipbook reading experience for a magazine article.
 *
 * The book is a fixed-size block of leaves rotated in 3D. Each page is its own
 * DOM subtree, so an image is rendered inside exactly one page and turns with
 * it. The block is measured against the viewport on every resize, and the front
 * cover image fills the cover page with object-fit: cover.
 */
export function Flipbook({ pages, contents, title, subtitle, issueLabel, backPath, backLabel = "Back to magazine", colophon }: FlipbookProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const [single, setSingle] = useState(false);
  const [current, setCurrent] = useState(0);
  const [turning, setTurning] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [linear, setLinear] = useState(false);
  const timerRef = useRef<number | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const currentRef = useRef(0);

  const total = pages.length;
  const leafCount = single ? Math.max(0, total - 1) : Math.ceil(total / 2);

  const leaves = useMemo(() => {
    const list: Array<{ front: number; back: number }> = [];
    for (let i = 0; i < leafCount; i += 1) {
      list.push({ front: single ? i : i * 2, back: single ? -1 : i * 2 + 1 });
    }
    return list;
  }, [leafCount, single]);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  /* ---------- sizing: the book always fits the viewport ---------- */
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw < MOBILE_BREAKPOINT;
    const chromeH = mobile ? 96 : 108;
    const availH = Math.max(240, vh - chromeH);
    const availW = Math.max(240, vw - (mobile ? 30 : 76));
    let pw: number;
    let ph: number;
    if (mobile) {
      pw = Math.min(availW, 460);
      ph = pw / PAGE_RATIO;
      if (ph > availH) {
        ph = availH;
        pw = ph * PAGE_RATIO;
      }
    } else {
      pw = Math.min(availW / 2, 560);
      ph = pw / PAGE_RATIO;
      if (ph > availH) {
        ph = availH;
        pw = ph * PAGE_RATIO;
      }
    }
    if (ph < 200) {
      ph = 200;
      pw = ph * PAGE_RATIO;
    }
    root.style.setProperty("--pw", `${Math.round(pw)}px`);
    root.style.setProperty("--ph", `${Math.round(ph)}px`);
    setSingle(mobile);
  }, []);

  useEffect(() => {
    measure();
    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(measure, 180);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [measure]);

  /* Keep the reading position when the layout switches between spread and single. */
  const previousSingle = useRef(single);
  useEffect(() => {
    if (previousSingle.current === single) return;
    const wasSingle = previousSingle.current;
    previousSingle.current = single;
    setCurrent((value) => {
      const side = wasSingle ? value : value * 2;
      const next = single ? side : Math.floor(side / 2);
      return Math.max(0, Math.min(next, leafCount));
    });
  }, [single, leafCount]);

  /* ---------- fit: shrink any page whose content would overflow ---------- */
  const fitAll = useCallback(() => {
    const book = bookRef.current;
    if (!book) return;
    book.querySelectorAll<HTMLElement>("[data-sheet]").forEach((sheet) => {
      const inner = sheet.querySelector<HTMLElement>("[data-sheet-inner]");
      if (!inner) return;
      inner.style.zoom = "";
      inner.style.width = "";
      inner.style.height = "";
      const cs = window.getComputedStyle(sheet);
      const pt = parseFloat(cs.paddingTop) || 0;
      const pb = parseFloat(cs.paddingBottom) || 0;
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const availH = sheet.clientHeight - pt - pb;
      const availW = sheet.clientWidth - pl - pr;
      if (availH <= 20 || availW <= 20) return;
      const needH = inner.scrollHeight;
      if (needH > availH + 2) {
        const k = Math.max(0.5, (availH - 1) / needH);
        inner.style.width = `${Math.round(availW / k)}px`;
        inner.style.height = `${Math.round(availH / k)}px`;
        inner.style.zoom = k.toFixed(4);
      }
    });
  }, []);

  useLayoutEffect(() => {
    fitAll();
  }, [fitAll, current, single, linear, total]);

  useEffect(() => {
    const onLoad = () => fitAll();
    window.addEventListener("load", onLoad);
    if (document.fonts?.ready) void document.fonts.ready.then(() => fitAll());
    return () => window.removeEventListener("load", onLoad);
  }, [fitAll]);

  /* ---------- turning ---------- */
  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, leafCount));
      currentRef.current = clamped;
      setCurrent(clamped);
      setTouched(true);
    },
    [leafCount],
  );

  const turn = useCallback(
    (dir: number) => {
      const value = currentRef.current;
      const next = value + dir;
      if (next < 0 || next > leafCount) return;
      const moving = dir > 0 ? value : value - 1;
      setTurning(moving);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setTurning(null), FLIP_MS);
      currentRef.current = next;
      setCurrent(next);
      setTouched(true);
    },
    [leafCount],
  );

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "ArrowRight" || key === " " || key === "PageDown") {
        event.preventDefault();
        turn(1);
      } else if (key === "ArrowLeft" || key === "PageUp") {
        event.preventDefault();
        turn(-1);
      } else if (key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (key === "End") {
        event.preventDefault();
        goTo(leafCount);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [goTo, leafCount, turn]);

  /* ---------- deep link: #p=N ---------- */
  useEffect(() => {
    const applyHash = () => {
      const match = (window.location.hash || "").match(/(?:spread|p)=(\d+)/);
      if (!match) return;
      const n = Number.parseInt(match[1], 10);
      if (!Number.isFinite(n)) return;
      const clamped = Math.max(0, Math.min(n, leafCount));
      currentRef.current = clamped;
      setCurrent(clamped);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [leafCount]);

  const jumpToPage = useCallback(
    (pageIndex: number) => {
      goTo(single ? pageIndex : Math.ceil(pageIndex / 2));
    },
    [goTo, single],
  );

  /* ---------- chrome labels ---------- */
  const counterLabel = useMemo(() => {
    if (single) return { left: pad(Math.min(current + 1, total)), right: pad(total) };
    if (current === 0) return { left: "01", right: pad(total) };
    if (current >= leafCount) return { left: pad(total), right: pad(total) };
    return { left: pad(current * 2), right: pad(Math.min(current * 2 + 1, total)) };
  }, [current, leafCount, single, total]);

  const progress = leafCount ? (current / leafCount) * 100 : 0;
  const sideIndex = single ? current : Math.min(current * 2, total - 1);
  const footLabel = pages[sideIndex]?.label || title;

  const renderPage = (index: number) => {
    const page = pages[index];
    if (!page) return null;
    if (page.kind === "cover") {
      return (
        <div className={`${styles.sheet} ${styles.coverSheet}`} data-sheet>
          {page.image ? (
            <div className={styles.coverArt}>
              {/* The cover image fills the front cover of the magazine. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.image.src} alt={page.image.alt || `${title} cover`} decoding="async" fetchPriority="high" />
            </div>
          ) : null}
          <div className={styles.coverInner} data-sheet-inner>
            <div className={styles.coverTop}>
              <b>RADARCharts</b>
              <span>{issueLabel}</span>
            </div>
            <h1 className={styles.coverTitle}>{title}</h1>
            {subtitle ? <p className={styles.coverSub}>{subtitle}</p> : null}
            <div className={styles.coverFoot}>
              <span>
                {contents.length ? `${contents.length} ${contents.length === 1 ? "feature" : "features"}` : "Feature"}
                <br />
                <em>remRADAR editorial</em>
              </span>
              <span className={styles.coverMark}>
                Issue
                <br />
                <em>{pad(total)} pages</em>
              </span>
            </div>
          </div>
        </div>
      );
    }
    if (page.kind === "contents") {
      return (
        <div className={styles.sheet} data-sheet>
          <div className={styles.sheetInner} data-sheet-inner>
            <p className={styles.eyebrow}>Contents</p>
            <h2 className={styles.contentsHead}>In this issue</h2>
            <ul className={styles.contentsList}>
              {contents.map((entry) => (
                <li key={`${entry.number}-${entry.folio}`}>
                  <button type="button" className={styles.contentsButton} onClick={() => jumpToPage(entry.folio - 1)}>
                    <span className={styles.contentsNum}>{entry.number}</span>
                    <span className={styles.contentsTitle}>{entry.title}</span>
                    <span className={styles.contentsPage}>{pad(entry.folio)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className={styles.spacer} />
            <p className={styles.folio}>{issueLabel}</p>
          </div>
        </div>
      );
    }
    if (page.kind === "plate" && page.image) {
      return (
        <div className={`${styles.sheet} ${styles.plateSheet}`} data-sheet>
          <div className={styles.plateFigure}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.image.src} alt={page.image.alt || title} loading="lazy" decoding="async" />
          </div>
          <div className={styles.plateCaption}>
            <span>Plate</span>
            <p>{page.image.caption || page.image.alt || title}</p>
          </div>
        </div>
      );
    }
    if (page.kind === "backcover") {
      return (
        <div className={`${styles.sheet} ${styles.backSheet}`} data-sheet>
          <div className={styles.backInner} data-sheet-inner>
            <div className={styles.backMark}>R</div>
            <p className={styles.backWord}>RADARCharts</p>
            <div className={styles.backRule} />
            <p className={styles.backLine}>{colophon || "RADARCharts by REM — protecting the music as remRADAR."}</p>
            <Link className={styles.backLink} href={backPath}>
              {backLabel}
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.sheet} data-sheet>
        <div className={styles.sheetInner} data-sheet-inner>
          <div className={styles.runhead}>
            <span>{issueLabel}</span>
            <span>{title}</span>
          </div>
          {page.html ? <div className={styles.body} dangerouslySetInnerHTML={{ __html: page.html }} /> : <div className={styles.spacer} />}
          <div className={styles.spacer} />
          <p className={styles.folio}>{pad(page.folio)}</p>
        </div>
      </div>
    );
  };

  if (linear) {
    return (
      <div className={styles.root} ref={rootRef}>
        <div className={styles.chrome}>
          <span className={styles.brand}>
            RADARCharts <em>{issueLabel}</em>
          </span>
          <button type="button" className={styles.backLink} onClick={() => setLinear(false)}>
            Flipbook view
          </button>
        </div>
        <div className="mx-auto w-full max-w-3xl overflow-y-auto px-5 pb-24">
          <h1 className="display mt-6 text-[clamp(2rem,6vw,4rem)] leading-[.92]">{title}</h1>
          {subtitle ? <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p> : null}
          {pages
            .filter((page) => page.kind === "text" || page.kind === "plate")
            .map((page) => (
              <section key={page.folio} className="mt-10 border-t-2 border-ink pt-6">
                {page.kind === "plate" && page.image ? (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={page.image.src} alt={page.image.alt || title} className="w-full" loading="lazy" decoding="async" />
                    {page.image.caption ? (
                      <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{page.image.caption}</figcaption>
                    ) : null}
                  </figure>
                ) : (
                  <div className={styles.body} dangerouslySetInnerHTML={{ __html: page.html }} />
                )}
              </section>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.chrome}>
        <span className={styles.brand}>
          RADARCharts <em>{issueLabel}</em>
        </span>
        <span className={styles.counter} aria-live="polite">
          <b>{counterLabel.left}</b>
          <s>–</s>
          {counterLabel.right}
          <span style={{ color: "#7e7e79" }}> / {pad(total)}</span>
        </span>
        <span className={styles.progress} aria-hidden="true">
          <span className={styles.progressFill} style={{ right: `${100 - progress}%` }} />
        </span>
        <span className={styles.navbtns}>
          <button type="button" onClick={() => goTo(0)} disabled={current <= 0} aria-label="Jump to front cover">
            ⇤
          </button>
          <button type="button" onClick={() => turn(-1)} disabled={current <= 0} aria-label="Previous spread">
            ‹
          </button>
          <button type="button" onClick={() => turn(1)} disabled={current >= leafCount} aria-label="Next spread">
            ›
          </button>
          <button type="button" onClick={() => goTo(leafCount)} disabled={current >= leafCount} aria-label="Jump to back cover">
            ⇥
          </button>
        </span>
      </div>

      <div
        className={styles.stage}
        onTouchStart={(event) => {
          if (event.touches.length !== 1) return;
          touchRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchRef.current;
          if (!start) return;
          touchRef.current = null;
          const touch = event.changedTouches[0];
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.3) turn(dx < 0 ? 1 : -1);
        }}
      >
        <button type="button" className={`${styles.edge} ${styles.edgeL}`} onClick={() => turn(-1)} disabled={current <= 0} aria-label="Previous page">
          ‹
        </button>
        <button type="button" className={`${styles.edge} ${styles.edgeR}`} onClick={() => turn(1)} disabled={current >= leafCount} aria-label="Next page">
          ›
        </button>

        <div
          className={[
            styles.book,
            single ? styles.single : "",
            !single && current === 0 ? styles.closedStart : "",
            !single && current >= leafCount ? styles.closedEnd : "",
          ]
            .filter(Boolean)
            .join(" ")}
          ref={bookRef}
        >
          {leaves.map((leaf, index) => {
            const flipped = index < current;
            const isTurning = turning === index;
            const zIndex = isTurning ? 9999 : flipped ? 2 * index + 1 : 2 * (leaves.length - index);
            return (
              <div
                key={index}
                className={[styles.leaf, flipped ? styles.flipped : "", isTurning ? styles.turning : ""].filter(Boolean).join(" ")}
                style={{ zIndex }}
              >
                <div className={`${styles.face} ${styles.faceFront}`}>{renderPage(leaf.front)}</div>
                <div className={`${styles.face} ${styles.faceBack}`}>{leaf.back >= 0 ? renderPage(leaf.back) : null}</div>
              </div>
            );
          })}
          {single ? <div className={`${styles.endcap} ${current >= leafCount ? styles.endcapShow : ""}`}>{renderPage(total - 1)}</div> : null}
          <div className={styles.spine} aria-hidden="true" />
        </div>
      </div>

      <div className={`${styles.chrome} ${styles.chromeBottom}`}>
        <span className={styles.footLabel}>{footLabel}</span>
        <span className={`${styles.hint} ${touched ? styles.hintGone : ""}`}>Use ← → or swipe to turn the page</span>
        <span className={styles.navbtns}>
          <button type="button" onClick={() => setLinear(true)} aria-label="Read as a single page">
            ≡
          </button>
          <Link className={styles.backLink} href={backPath}>
            {backLabel}
          </Link>
        </span>
      </div>
    </div>
  );
}
