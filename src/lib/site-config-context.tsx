"use client";
import { useCallback, useEffect, useState } from "react";
import { defaultSiteConfig, normalizeSiteConfig, SITE_CONFIG_KEY, type GlobalSiteConfig } from "@/types/site-config";

export function useSiteConfig() {
  const [config, setConfigState] = useState<GlobalSiteConfig>(defaultSiteConfig);
  useEffect(() => { try { const raw = window.localStorage.getItem(SITE_CONFIG_KEY); if (raw) queueMicrotask(() => setConfigState(normalizeSiteConfig(JSON.parse(raw)))); } catch {} }, []);
  useEffect(() => { const sync = () => { try { const raw = window.localStorage.getItem(SITE_CONFIG_KEY); if (raw) setConfigState(normalizeSiteConfig(JSON.parse(raw))); } catch {} }; window.addEventListener("radar-config-updated", sync); window.addEventListener("storage", sync); return () => { window.removeEventListener("radar-config-updated", sync); window.removeEventListener("storage", sync); }; }, []);
  const setConfig = useCallback((next: GlobalSiteConfig) => { const safe = normalizeSiteConfig(next); setConfigState(safe); window.localStorage.setItem(SITE_CONFIG_KEY, JSON.stringify(safe)); window.dispatchEvent(new Event("radar-config-updated")); }, []);
  return { config, setConfig };
}
