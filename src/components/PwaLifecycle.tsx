"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaLifecycle() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    const standalone = isStandalone();
    let iosHelpTimer: number | undefined;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => setInstallPrompt(null);
    const onServiceWorkerUpdate = () => setUpdateReady(true);

    if (!standalone) {
      window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.addEventListener("appinstalled", onAppInstalled);
    }
    window.addEventListener("radar:sw-update", onServiceWorkerUpdate);

    if (!standalone && isIos()) {
      const dismissed = window.sessionStorage.getItem("radar-ios-install-help");
      if (!dismissed) iosHelpTimer = window.setTimeout(() => setIosHelp(true), 0);
    }

    return () => {
      if (iosHelpTimer !== undefined) window.clearTimeout(iosHelpTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("radar:sw-update", onServiceWorkerUpdate);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const dismissIosHelp = () => {
    window.sessionStorage.setItem("radar-ios-install-help", "true");
    setIosHelp(false);
  };

  const refresh = async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration?.waiting) {
      window.location.reload();
      return;
    }
    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange, { once: true });
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  if (!installPrompt && !iosHelp && !updateReady) return null;

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-xl border-2 border-ink bg-paper p-4 text-ink shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[min(32rem,calc(100vw-2rem))]" aria-live="polite">
      {updateReady ? (
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em]">A fresh RADAR build is ready.</p>
          <button type="button" onClick={() => void refresh()} className="min-h-11 shrink-0 border-2 border-ink px-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-flare">Refresh</button>
        </div>
      ) : iosHelp ? (
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em]">Install RADAR on this iPhone</p>
          <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">Tap Share, then choose <strong className="text-ink">Add to Home Screen</strong>. RADAR will open like an app from your launcher.</p>
          <button type="button" onClick={dismissIosHelp} className="mt-3 min-h-11 border-2 border-ink px-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-flare">Got it</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.12em]">Install RADAR as an app.</p>
          <button type="button" onClick={install} className="min-h-11 shrink-0 border-2 border-ink px-3 font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-flare">Install</button>
        </div>
      )}
    </aside>
  );
}
