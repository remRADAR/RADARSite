export type AmbientStatus = "IDLE" | "READY" | "ACTIVATING" | "ACTIVE" | "ERROR";
export const MAX_AMBIENT_VOLUME = 0.55;
export const DEFAULT_AMBIENT_VOLUME = 0.3;
export const AMBIENT_TRACK_SRC = "/audio/backgroundsound.mp3";

const VOLUME_KEY = "radar-ambient-volume-v1";
const ACTIVATED_KEY = "radar-ambient-activated-v1";
const FADE_MS = 700;
const SERVER_SNAPSHOT: Snapshot = { status: "IDLE", volume: DEFAULT_AMBIENT_VOLUME, foregroundMuted: false, error: "" };

type Snapshot = { status: AmbientStatus; volume: number; foregroundMuted: boolean; error: string };
type Listener = () => void;

export function clampAmbientVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_AMBIENT_VOLUME;
  return Math.min(MAX_AMBIENT_VOLUME, Math.max(0, value));
}

function readSessionNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored === null || stored.trim() === "") return fallback;
    const value = Number(stored);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeSession(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Audio remains usable when session storage is unavailable.
  }
}

function foregroundMessage(data: unknown): "playing" | "stopped" | null {
  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data) as { event?: string; data?: number; info?: { playerState?: number }; infoDelivery?: { playerState?: number } };
    const state = parsed.data ?? parsed.info?.playerState ?? parsed.infoDelivery?.playerState;
    if (parsed.event === "onStateChange" || parsed.event === "infoDelivery") {
      if (state === 1 || state === 3) return "playing";
      if (state === 0 || state === 2 || state === 5) return "stopped";
    }
    if (parsed.event === "play" || parsed.event === "playing") return "playing";
    if (parsed.event === "pause" || parsed.event === "ended") return "stopped";
  } catch {
    return null;
  }
  return null;
}

export class RadarAmbientEngine {
  private audio: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private foreground = new Set<EventTarget | string>();
  private fadeTimer: number | null = null;
  private pauseTimer: number | null = null;
  private activationPromise: Promise<boolean> | null = null;
  private snapshot: Snapshot = { status: "IDLE", volume: DEFAULT_AMBIENT_VOLUME, foregroundMuted: false, error: "" };
  private bound = false;

  constructor() {
    this.snapshot = { ...this.snapshot, volume: clampAmbientVolume(readSessionNumber(VOLUME_KEY, DEFAULT_AMBIENT_VOLUME)) };
  }

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => SERVER_SNAPSHOT;
  subscribe = (listener: Listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };

  private setSnapshot(next: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener());
  }

  private clearFade() {
    if (this.fadeTimer === null || typeof window === "undefined") return;
    window.clearInterval(this.fadeTimer);
    this.fadeTimer = null;
  }

  private desiredVolume(multiplier = 1) {
    const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
    return this.snapshot.foregroundMuted || hidden || this.snapshot.status !== "ACTIVE"
      ? 0
      : clampAmbientVolume(this.snapshot.volume) * multiplier;
  }

  private setAudioTarget(multiplier = 1, duration = FADE_MS) {
    const audio = this.audio;
    if (!audio || typeof window === "undefined") return;
    const start = audio.volume;
    const target = this.desiredVolume(multiplier);
    this.clearFade();
    if (duration <= 0 || start === target) {
      audio.volume = target;
      return;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      audio.volume = Math.max(0, Math.min(1, start + (target - start) * progress));
      if (progress >= 1) {
        window.clearInterval(timer);
        if (this.fadeTimer === timer) this.fadeTimer = null;
      }
    }, 40);
    this.fadeTimer = timer;
  }

  private ensureAudio() {
    if (this.audio || typeof window === "undefined") return this.audio;
    const audio = new Audio(AMBIENT_TRACK_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audio.setAttribute("aria-hidden", "true");
    audio.addEventListener("error", () => {
      if (this.snapshot.status !== "ACTIVATING" && this.snapshot.status !== "ACTIVE") return;
      this.clearFade();
      writeSession(ACTIVATED_KEY, "false");
      this.setSnapshot({ status: "ERROR", error: "The RADAR background track could not be loaded." });
      audio.volume = 0;
      audio.pause();
    });
    const handleUnexpectedStop = () => {
      if (this.snapshot.status !== "ACTIVE") return;
      this.clearFade();
      writeSession(ACTIVATED_KEY, "false");
      this.setSnapshot({ status: "READY", error: "Background audio playback was interrupted. Activate it to resume." });
      audio.volume = 0;
    };
    audio.addEventListener("pause", handleUnexpectedStop);
    audio.addEventListener("ended", handleUnexpectedStop);
    this.audio = audio;
    return audio;
  }

  private bindForegroundListeners() {
    if (this.bound || typeof window === "undefined") return;
    this.bound = true;
    const mark = (target: EventTarget | string, active: boolean) => {
      if (active) this.foreground.add(target); else this.foreground.delete(target);
      this.setSnapshot({ foregroundMuted: this.foreground.size > 0 });
      this.setAudioTarget(1, 450);
    };
    document.addEventListener("play", (event) => {
      if (event.target === this.audio) return;
      if (event.target instanceof HTMLMediaElement) mark(event.target, true);
    }, true);
    document.addEventListener("pause", (event) => {
      if (event.target === this.audio) return;
      if (event.target instanceof HTMLMediaElement) mark(event.target, false);
    }, true);
    document.addEventListener("ended", (event) => {
      if (event.target === this.audio) return;
      if (event.target instanceof HTMLMediaElement) mark(event.target, false);
    }, true);
    window.addEventListener("message", (event) => {
      const state = foregroundMessage(event.data);
      if (!state) return;
      const target = event.source || window;
      mark(target, state === "playing");
    });
    window.addEventListener("radar:foreground-media", (event) => {
      const detail = (event as CustomEvent<{ id?: string; playing?: boolean }>).detail;
      if (!detail?.id) return;
      mark(detail.id, detail.playing === true);
    });
    document.addEventListener("visibilitychange", () => {
      if (this.snapshot.status !== "ACTIVE") return;
      this.setAudioTarget(document.visibilityState === "visible" ? 1 : 0, 600);
    });
  }

  async activate() {
    if (this.snapshot.status === "ACTIVE") return true;
    if (this.activationPromise) return this.activationPromise;
    const audio = this.ensureAudio();
    if (!audio) {
      this.setSnapshot({ status: "ERROR", error: "Audio is unavailable in this browser." });
      return false;
    }

    this.setSnapshot({ status: "ACTIVATING", error: "" });
    this.bindForegroundListeners();
    if (this.pauseTimer !== null) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }

    const attempt = (async () => {
      try {
        await audio.play();
        if (this.snapshot.status !== "ACTIVATING") {
          audio.pause();
          return false;
        }
        this.setSnapshot({ status: "ACTIVE", error: "" });
        writeSession(ACTIVATED_KEY, "true");
        this.setAudioTarget(1, FADE_MS);
        return true;
      } catch (error) {
        const blockedByPolicy = error instanceof DOMException && error.name === "NotAllowedError";
        const message = blockedByPolicy
          ? "Audio was blocked by your browser. Select the button to try again."
          : error instanceof Error && error.message
            ? error.message
            : "Audio activation was blocked. Select the button to try again.";
        this.setSnapshot({ status: "ERROR", error: message });
        this.clearFade();
        audio.volume = 0;
        audio.pause();
        return false;
      }
    })();
    this.activationPromise = attempt;
    try {
      return await attempt;
    } finally {
      if (this.activationPromise === attempt) this.activationPromise = null;
    }
  }

  deactivate() {
    if (this.snapshot.status !== "ACTIVE" || typeof window === "undefined") return;
    writeSession(ACTIVATED_KEY, "false");
    this.setSnapshot({ status: "READY", error: "" });
    this.setAudioTarget(0, 600);
    if (this.pauseTimer !== null) window.clearTimeout(this.pauseTimer);
    this.pauseTimer = window.setTimeout(() => {
      this.audio?.pause();
      this.pauseTimer = null;
    }, 650);
  }

  setVolume(value: number) {
    const volume = clampAmbientVolume(value);
    writeSession(VOLUME_KEY, String(volume));
    this.setSnapshot({ volume });
    this.setAudioTarget(1, 350);
  }
}

export const radarAmbientEngine = new RadarAmbientEngine();
