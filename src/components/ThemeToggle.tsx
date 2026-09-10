"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "radarcharts-theme";
type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const resolvePreference = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      const preferred: Theme = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      setTheme(preferred);
      applyTheme(preferred);
      return stored;
    };

    const stored = resolvePreference();
    if (stored) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const followSystem = (event: MediaQueryListEvent) => {
      const next: Theme = event.matches ? "light" : "dark";
      setTheme(next);
      applyTheme(next);
    };
    mediaQuery.addEventListener("change", followSystem);
    return () => mediaQuery.removeEventListener("change", followSystem);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <button type="button" onClick={toggle} aria-pressed={theme === "light"} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} className="flex items-center gap-2 border-l-2 border-ink px-3 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-flare hover:text-flare-foreground sm:px-4">
      <span aria-hidden className="text-sm">{theme === "dark" ? "☼" : "◐"}</span>
      <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
