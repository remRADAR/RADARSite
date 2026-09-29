"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function EditorialMediaEnhancer({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const media = Array.from(root.querySelectorAll<HTMLImageElement | HTMLIFrameElement>("img[data-src], iframe[data-src]"));
    if (!media.length) return;

    const activate = (element: HTMLImageElement | HTMLIFrameElement) => {
      const source = element.dataset.src;
      if (!source || element.getAttribute("src")) return;
      element.src = source;
      element.removeAttribute("data-src");
      const frame = element.closest(".editorial-embed");
      frame?.classList.add("is-loading");
      element.addEventListener("load", () => frame?.classList.replace("is-loading", "is-ready"), { once: true });
      element.addEventListener("error", () => {
        element.classList.add("is-error");
        frame?.classList.replace("is-loading", "is-error");
        window.setTimeout(() => {
          if (!element.isConnected || !element.classList.contains("is-error")) return;
          element.classList.remove("is-error");
          element.src = source;
        }, 1200);
      }, { once: true });
    };

    if (!("IntersectionObserver" in window)) {
      media.forEach(activate);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && activate(entry.target as HTMLImageElement | HTMLIFrameElement)),
      { rootMargin: "720px 0px" },
    );
    media.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <div ref={rootRef} data-editorial-media-root>{children}</div>;
}
