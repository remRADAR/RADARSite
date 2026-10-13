"use client";

import { useEffect, useRef, type ReactNode } from "react";

const RETRY_DELAY_MS = 1200;
const EMBED_TIMEOUT_MS = 6000;

/**
 * Progressive enhancement for sanitized editorial media:
 * - lazy-activates media that still carries data-src (legacy markup),
 * - marks inline images is-ready/is-error and retries a failed image once,
 * - tracks .editorial-embed wrappers through is-loading/is-ready/is-error.
 * The sanitizer emits plain src attributes, so plain media is watched directly.
 */
export function EditorialMediaEnhancer({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    const watchImage = (image: HTMLImageElement) => {
      let retried = false;
      const markReady = () => {
        image.classList.remove("is-error");
        image.classList.add("is-ready");
      };
      const markError = () => {
        image.classList.add("is-error");
        image.classList.remove("is-ready");
        if (retried) return;
        retried = true;
        window.setTimeout(() => {
          if (!image.isConnected || !image.classList.contains("is-error")) return;
          image.classList.remove("is-error");
          // Reassigning the same URL forces the browser to retry the fetch.
          image.src = image.currentSrc || image.src;
        }, RETRY_DELAY_MS);
      };
      if (image.complete) {
        if (image.naturalWidth > 0) markReady();
        else markError();
        return;
      }
      image.addEventListener("load", markReady);
      image.addEventListener("error", markError);
      cleanups.push(() => {
        image.removeEventListener("load", markReady);
        image.removeEventListener("error", markError);
      });
    };

    const watchEmbed = (frame: HTMLIFrameElement) => {
      const wrapper = frame.closest(".editorial-embed");
      if (!wrapper) return;
      wrapper.classList.add("is-loading");
      const markReady = () => {
        wrapper.classList.remove("is-loading", "is-error");
        wrapper.classList.add("is-ready");
      };
      const markError = () => {
        wrapper.classList.remove("is-loading");
        wrapper.classList.add("is-error");
      };
      // CSP-blocked frames can commit a blank document and still fire load, so
      // a timeout guarantees the wrapper never spins on "Loading media" forever.
      const timeout = window.setTimeout(() => {
        if (wrapper.classList.contains("is-loading")) markError();
      }, EMBED_TIMEOUT_MS);
      frame.addEventListener("load", markReady);
      frame.addEventListener("error", markError);
      cleanups.push(() => {
        window.clearTimeout(timeout);
        frame.removeEventListener("load", markReady);
        frame.removeEventListener("error", markError);
      });
    };

    // Plain-src media is already loading; watch it immediately so failures are
    // marked even before the element scrolls into view.
    root.querySelectorAll<HTMLImageElement>("img.editorial-media").forEach(watchImage);
    root.querySelectorAll<HTMLIFrameElement>(".editorial-embed iframe").forEach(watchEmbed);

    // Legacy data-src media is activated lazily near the viewport.
    const lazyMedia = Array.from(root.querySelectorAll<HTMLImageElement | HTMLIFrameElement>("img[data-src], iframe[data-src]"));
    if (lazyMedia.length) {
      const activate = (element: HTMLImageElement | HTMLIFrameElement) => {
        const source = element.dataset.src;
        if (!source || element.getAttribute("src")) return;
        element.src = source;
        element.removeAttribute("data-src");
        if (element instanceof HTMLImageElement) watchImage(element);
        else watchEmbed(element);
      };
      if (!("IntersectionObserver" in window)) {
        lazyMedia.forEach(activate);
      } else {
        const observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              activate(entry.target as HTMLImageElement | HTMLIFrameElement);
              observer.unobserve(entry.target);
            }
          },
          { rootMargin: "720px 0px" },
        );
        lazyMedia.forEach((element) => observer.observe(element));
        cleanups.push(() => observer.disconnect());
      }
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return <div ref={rootRef} data-editorial-media-root>{children}</div>;
}
