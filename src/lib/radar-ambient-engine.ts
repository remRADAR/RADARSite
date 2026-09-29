export type AmbientPeriod = "early-morning" | "daytime" | "evening" | "night" | "late-night";
export type AmbientStatus = "IDLE" | "READY" | "ACTIVATING" | "ACTIVE" | "ERROR";
export const MAX_AMBIENT_VOLUME = 0.55;
export const DEFAULT_AMBIENT_VOLUME = 0.3;
export const AMBIENT_PERIODS: AmbientPeriod[] = ["early-morning", "daytime", "evening", "night", "late-night"];

const VOLUME_KEY = "radar-ambient-volume-v1";
const ACTIVATED_KEY = "radar-ambient-activated-v1";
const TRANSITION_MS = 2600;
const PERIOD_CHECK_MS = 60_000;
const SERVER_SNAPSHOT: Snapshot = { status: "IDLE", volume: DEFAULT_AMBIENT_VOLUME, period: "daytime", foregroundMuted: false, error: "" };

type Snapshot = { status: AmbientStatus; volume: number; period: AmbientPeriod; foregroundMuted: boolean; error: string };
type Listener = () => void;
type Source = { output: GainNode; nodes: OscillatorNode[]; stop: () => void };

type AmbientProfile = { base: number; fifth: number; shimmer: number; filter: number };
const PROFILES: Record<AmbientPeriod, AmbientProfile> = {
  "early-morning": { base: 146.83, fifth: 220, shimmer: 293.66, filter: 1500 },
  daytime: { base: 174.61, fifth: 261.63, shimmer: 349.23, filter: 1900 },
  evening: { base: 130.81, fifth: 196, shimmer: 261.63, filter: 1250 },
  night: { base: 110, fifth: 164.81, shimmer: 220, filter: 900 },
  "late-night": { base: 82.41, fifth: 123.47, shimmer: 164.81, filter: 680 },
};

export function clampAmbientVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_AMBIENT_VOLUME;
  return Math.min(MAX_AMBIENT_VOLUME, Math.max(0, value));
}

/** Uses the browser's local clock. No server timezone or global fixed timezone is used. */
export function getAmbientPeriod(date = new Date()): AmbientPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 8) return "early-morning";
  if (hour >= 8 && hour < 17) return "daytime";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21 || hour < 1) return "night";
  return "late-night";
}

function readSessionNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = Number(window.sessionStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Audio remains usable when session storage is unavailable.
  }
}

function audioContextConstructor() {
  if (typeof window === "undefined") return null;
  const candidate = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext || candidate.webkitAudioContext || null;
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
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private currentSource: Source | null = null;
  private listeners = new Set<Listener>();
  private foreground = new Set<EventTarget | string>();
  private periodTimer: number | null = null;
  private transitionTimer: number | null = null;
  private transitionToken = 0;
  private snapshot: Snapshot = { status: "IDLE", volume: DEFAULT_AMBIENT_VOLUME, period: getAmbientPeriod(), foregroundMuted: false, error: "" };
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

  private setMasterTarget(value: number, duration = 0.35) {
    if (!this.master || !this.context) return;
    const now = this.context.currentTime;
    const target = this.snapshot.foregroundMuted || this.snapshot.status !== "ACTIVE" ? 0 : clampAmbientVolume(this.snapshot.volume) * value;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(target, now + duration);
  }

  private createSource(period: AmbientPeriod): Source {
    if (!this.context || !this.master) throw new Error("Ambient audio context is unavailable");
    const profile = PROFILES[period];
    const output = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = profile.filter;
    filter.Q.value = 0.45;
    output.gain.value = 0;
    filter.connect(output).connect(this.master);
    const tones = [
      { frequency: profile.base, type: "sine" as OscillatorType, gain: 0.46 },
      { frequency: profile.fifth, type: "triangle" as OscillatorType, gain: 0.18 },
      { frequency: profile.shimmer, type: "sine" as OscillatorType, gain: 0.06 },
    ];
    const nodes = tones.map((tone, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = tone.type;
      oscillator.frequency.value = tone.frequency;
      oscillator.detune.value = index === 1 ? -3 : index === 2 ? 4 : 0;
      gain.gain.value = tone.gain;
      oscillator.connect(gain).connect(filter);
      oscillator.start();
      return oscillator;
    });
    const stop = () => {
      nodes.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } });
      try { output.disconnect(); filter.disconnect(); } catch { /* disposed */ }
    };
    return { output, nodes, stop };
  }

  private startPeriod(period: AmbientPeriod) {
    if (!this.context || !this.master) return;
    const next = this.createSource(period);
    const now = this.context.currentTime;
    next.output.gain.setValueAtTime(0, now);
    next.output.gain.linearRampToValueAtTime(1, now + TRANSITION_MS / 1000);
    const previous = this.currentSource;
    if (previous) {
      previous.output.gain.cancelScheduledValues(now);
      previous.output.gain.setValueAtTime(previous.output.gain.value, now);
      previous.output.gain.linearRampToValueAtTime(0, now + TRANSITION_MS / 1000);
    }
    this.currentSource = next;
    const token = ++this.transitionToken;
    if (this.transitionTimer !== null) window.clearTimeout(this.transitionTimer);
    this.transitionTimer = window.setTimeout(() => {
      if (token === this.transitionToken && previous) previous.stop();
      this.transitionTimer = null;
    }, TRANSITION_MS + 100);
    this.setSnapshot({ period });
    this.setMasterTarget(1, 0.15);
  }

  private bindForegroundListeners() {
    if (this.bound || typeof window === "undefined") return;
    this.bound = true;
    const mark = (target: EventTarget | string, active: boolean) => {
      if (active) this.foreground.add(target); else this.foreground.delete(target);
      this.setSnapshot({ foregroundMuted: this.foreground.size > 0 });
      this.setMasterTarget(1, 0.45);
    };
    document.addEventListener("play", (event) => {
      if (event.target instanceof HTMLMediaElement) mark(event.target, true);
    }, true);
    document.addEventListener("pause", (event) => {
      if (event.target instanceof HTMLMediaElement) mark(event.target, false);
    }, true);
    document.addEventListener("ended", (event) => {
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
      this.setMasterTarget(document.visibilityState === "visible" ? 1 : 0, 0.6);
    });
  }

  private schedulePeriodChecks() {
    if (this.periodTimer !== null || typeof window === "undefined") return;
    this.periodTimer = window.setInterval(() => {
      if (this.snapshot.status !== "ACTIVE") return;
      const period = getAmbientPeriod();
      if (period !== this.snapshot.period) this.startPeriod(period);
    }, PERIOD_CHECK_MS);
  }

  async activate() {
    if (this.snapshot.status === "ACTIVE") return true;
    const Constructor = audioContextConstructor();
    if (!Constructor) {
      this.setSnapshot({ status: "ERROR", error: "Web Audio is unavailable in this browser." });
      return false;
    }
    this.setSnapshot({ status: "ACTIVATING", error: "" });
    try {
      if (!this.context) {
        this.context = new Constructor();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);
        this.bindForegroundListeners();
      }
      await this.context.resume();
      if (this.context.state !== "running") throw new Error("The browser kept audio suspended.");
      this.setSnapshot({ status: "ACTIVE", period: getAmbientPeriod() });
      this.startPeriod(this.snapshot.period);
      writeSession(ACTIVATED_KEY, "true");
      this.schedulePeriodChecks();
      this.setMasterTarget(1, 0.7);
      return true;
    } catch (error) {
      this.setSnapshot({ status: "READY", error: error instanceof Error ? error.message : "Audio activation was blocked." });
      return false;
    }
  }

  deactivate() {
    if (this.snapshot.status !== "ACTIVE") return;
    writeSession(ACTIVATED_KEY, "false");
    this.setSnapshot({ status: "READY" });
    this.setMasterTarget(0, 0.6);
  }

  setVolume(value: number) {
    const volume = clampAmbientVolume(value);
    writeSession(VOLUME_KEY, String(volume));
    this.setSnapshot({ volume });
    this.setMasterTarget(1, 0.35);
  }

}

export const radarAmbientEngine = new RadarAmbientEngine();
