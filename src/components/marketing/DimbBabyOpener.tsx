"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DimbBabyOpener.module.css";

type Phase = "idle" | "grab" | "welcome" | "vibe";

const WELCOME_AUDIO_SRC = "/media/podcast-welcome.mp3";

// Beats of the opening sequence. The welcome line is spoken between GRAB_MS and
// the end of the audio; when the file ends the baby drops his hands and vibes.
const GRAB_MS = 1150;

/**
 * Frame 1 of the DuMb podcast opener.
 *
 * Composition, in deliberate order: the baby photograph, then the featured
 * statement, then the scroll indicator. The banner GIF that used to sit behind
 * this frame is gone; the photograph now carries the description area itself.
 */
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
    <section className={styles.intro} aria-label="DuMb podcast opening" tabIndex={0}>
      <p className={styles.kicker}>(02 / DuMb)</p>

      <div className={styles.composition}>
        <div className={styles.stage + phaseClass}>
          <div aria-hidden="true" className={styles.floorShadow} />
          <picture className={styles.frame}>
            <img
              className={styles.figure}
              src="/media/podcast/baby-1400.webp"
              alt="A baby wearing large headphones, hands raised to the ear cups"
              width={1400}
              height={1187}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
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

        <p className={styles.statement}>REMEMBER, DON&apos;T STAY DUMB ON THE RADAR</p>
      </div>

      <p className={styles.scrollCue}>
        <span>Scroll</span>
        <span aria-hidden="true" className={styles.scrollArrow}>
          ↓
        </span>
      </p>
    </section>
  );
}
