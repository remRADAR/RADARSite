"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DimbBabyOpener.module.css";

type Phase = "idle" | "grab" | "welcome" | "vibe";

const WELCOME_AUDIO_SRC = "/media/podcast-welcome.mp3";

// Beats of the opening sequence. The welcome line is spoken between GRAB_MS and
// the end of the audio; when the file ends the baby drops his hands and vibes.
const GRAB_MS = 1150;

export function DimbBabyOpener() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [blocked, setBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const settle = useCallback(() => {
    setBlocked(false);
    const audio = audioRef.current;
    if (!audio) return;
    // Every path that fails to produce sound still reaches "vibe", so the
    // opener never strands the visitor on a still frame.
    const fallback = window.setTimeout(() => setPhase("vibe"), 9000);
    timers.current.push(fallback);

    audio
      .play()
      .then(() => {
        setPhase("welcome");
      })
      .catch(() => {
        // Autoplay refused: keep the grab frame and offer the tap control.
        window.clearTimeout(fallback);
        setPhase("grab");
        setBlocked(true);
      });
  }, []);

  useEffect(() => {
    const audio = new Audio(WELCOME_AUDIO_SRC);
    audio.preload = "auto";
    audioRef.current = audio;

    const onEnded = () => setPhase("vibe");
    audio.addEventListener("ended", onEnded);

    timers.current.push(window.setTimeout(settle, GRAB_MS));

    return () => {
      clearTimers();
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [settle, clearTimers]);

  const onPlay = () => {
    clearTimers();
    setPhase("grab");
    window.setTimeout(() => settle(), 450);
  };

  const phaseClass =
    phase === "grab"
      ? " " + styles.stageGrab
      : phase === "welcome"
        ? " " + styles.stageGrab + " " + styles.stageWelcome
        : phase === "vibe"
          ? " " + styles.stageVibe
          : "";

  return (
    <section className={styles.intro} aria-label="DIMB podcast opening">
      <p className={styles.kicker}>(02 / DIMB)</p>

      <div className={styles.stage + phaseClass}>
        <div aria-hidden="true" className={styles.frame} />
        <div aria-hidden="true" className={styles.cups} />
      </div>

      <div className={styles.caption}>
        <p className={styles.captionLine}>
          Deep in my bones, the records that never left us.
        </p>
        {phase === "welcome" ? (
          <p className={styles.captionNow}>
            <span aria-hidden="true" className={styles.pip} />
            <span>Welcome is playing</span>
          </p>
        ) : null}
        {blocked ? (
          <button type="button" className={styles.play} onClick={onPlay}>
            Play the welcome
          </button>
        ) : null}
      </div>

      {phase === "vibe" ? <p className={styles.scrollCue}>Scroll ↓</p> : null}
      <div aria-hidden="true" className={styles.rule} />
    </section>
  );
}
