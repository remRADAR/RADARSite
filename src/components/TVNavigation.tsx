"use client";

import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

const DIRECTION_KEYS = new Map<string, "left" | "right" | "up" | "down">([
  ["ArrowLeft", "left"],
  ["ArrowRight", "right"],
  ["ArrowUp", "up"],
  ["ArrowDown", "down"],
]);

const ACTIVATION_KEYS = new Set(["Enter", " ", "NumpadEnter", "Accept", "Select", "GamepadA"]);
const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable=\"true\"]";

function visibleFocusableElements() {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.closest("[inert], [aria-hidden=\"true\"]")) return false;
    if (element.classList.contains("sr-only")) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && style.pointerEvents !== "none";
  });
}

function moveFocus(direction: "left" | "right" | "up" | "down") {
  const current = document.activeElement as HTMLElement | null;
  if (current?.matches(EDITABLE_SELECTOR)) return false;

  const elements = visibleFocusableElements();
  if (!elements.length) return false;
  if (!current || !elements.includes(current)) {
    elements[0]?.focus({ preventScroll: true });
    elements[0]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }

  const currentRect = current.getBoundingClientRect();
  const currentX = currentRect.left + currentRect.width / 2;
  const currentY = currentRect.top + currentRect.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const element of elements) {
    if (element === current) continue;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const dx = x - currentX;
    const dy = y - currentY;
    const inDirection = (direction === "left" && dx < 0) || (direction === "right" && dx > 0) || (direction === "up" && dy < 0) || (direction === "down" && dy > 0);
    if (!inDirection) continue;

    const primary = direction === "left" || direction === "right" ? Math.abs(dx) : Math.abs(dy);
    const secondary = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2;
    if (score < bestScore) {
      best = element;
      bestScore = score;
    }
  }

  if (!best) return false;
  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

function isAndroidTv() {
  return /android\s*(?:tv|google tv)|smart-tv|bravia|aft\w+/i.test(navigator.userAgent);
}

export function TVNavigation() {
  useEffect(() => {
    if (isAndroidTv()) document.documentElement.dataset.tvMode = "true";

    const rememberFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches(FOCUSABLE_SELECTOR)) document.documentElement.dataset.tvFocus = target.tagName.toLowerCase();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = DIRECTION_KEYS.get(event.key);
      if (direction) {
        if (moveFocus(direction)) event.preventDefault();
        return;
      }

      if (!ACTIVATION_KEYS.has(event.key)) return;
      const target = document.activeElement as HTMLElement | null;
      if (!target || target === document.body || target === document.documentElement || target.matches(EDITABLE_SELECTOR)) return;
      if (target.matches("a[href], button, input, select, textarea, [role=\"button\"]")) {
        target.click();
        event.preventDefault();
      }
    };

    document.addEventListener("focusin", rememberFocus, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      delete document.documentElement.dataset.tvMode;
      delete document.documentElement.dataset.tvFocus;
      document.removeEventListener("focusin", rememberFocus, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
