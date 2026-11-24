"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./DimbLogoOpener.module.css";

// The spelled logotype: capital D, the animated eye standing in for the I,
// capital M, small b. The eye is not decoration before the word - it is the
// second letter, inline at the same size and baseline.
const WORDMARK_START = 160;
const LETTER_STEP = 150;

export function DimbLogoOpener() {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !played) {
            setInView(true);
            setPlayed(true);
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [played]);

  const cls = inView ? " " + styles.wordmarkIn : "";

  return (
    <section
      ref={ref}
      className={styles.opener + (inView ? " " + styles.openerIn : "")}
      aria-label="DuMb logotype"
      tabIndex={0}
    >
      <div className={styles.inner}>
        <p className={styles.wordmark + cls} aria-label="DuMb">
          <span
            aria-hidden="true"
            className={styles.letter}
            style={{ animationDelay: WORDMARK_START + "ms" }}
          >
            D
          </span>

          <span aria-hidden="true" className={styles.eyeSlot}>
            <Image
              src="/media/podcast-logo-eye.png"
              alt=""
              width={740}
              height={431}
              className={styles.eye + (inView ? " " + styles.eyeBlink : "")}
              sizes="(max-width: 768px) 15vw, 62px"
            />
          </span>

          <span
            aria-hidden="true"
            className={styles.letter}
            style={{ animationDelay: WORDMARK_START + LETTER_STEP * 2 + "ms" }}
          >
            M
          </span>

          <span
            aria-hidden="true"
            className={styles.letter + " " + styles.letterLower}
            style={{ animationDelay: WORDMARK_START + LETTER_STEP * 3 + "ms" }}
          >
            b
          </span>
        </p>

        <div aria-hidden="true" className={styles.rule} />
        <p className={styles.strap}>Deep in my bones</p>
      </div>
    </section>
  );
}
