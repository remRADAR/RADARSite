"use client";

import { useEffect, useRef, useState } from "react";
import { FounderLanyard } from "./FounderLanyard";
import styles from "./FounderFrame.module.css";

export function FounderFrame() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const activatorRef = useRef<HTMLElement | null>(null);
  const passFrameRef = useRef<HTMLDivElement>(null);

  const openFounderHighlight = () => {
    activatorRef.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : passFrameRef.current;
    setIsOpen(true);
  };

  const closeFounderHighlight = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) {
      activatorRef.current?.focus();
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])")?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFounderHighlight();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])"),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <section className={styles.frame} aria-labelledby="founder-frame-title">
      <div className={styles.frameTopline}>
        <p>(02 / Founder pass)</p>
        <p>REM / Founder archive</p>
      </div>

      <div className={styles.headingRow}>
        <h2 id="founder-frame-title" className={styles.heading}>
          THE <span>FOUNDER.</span>
        </h2>
        <p className={styles.headingNote}>The hand behind the signal.</p>
      </div>

      <div className={styles.passFrame} ref={passFrameRef} tabIndex={-1}>
        <FounderLanyard onActivate={openFounderHighlight} />
        <p className={styles.passMark} aria-hidden="true">
          CZA OF REM <span>/</span> REM
        </p>
      </div>

      {isOpen ? (
        <div
          className={styles.dialogLayer}
          role="presentation"
          onClick={closeFounderHighlight}
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="founder-dialog-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.dialogTopline}>
              <span>Founder / REM</span>
              <button type="button" className={styles.close} onClick={closeFounderHighlight} aria-label="Close founder highlight">
                Close <span aria-hidden="true">×</span>
              </button>
            </div>
            <p className={styles.dialogKicker}>CZA OF REM</p>
            <h3 id="founder-dialog-title">Tarzaa Gerald Caesar</h3>
            <p className={styles.role}>Founder / CEO / Industry strategist</p>
            <p className={styles.body}>
              Tarzaa Gerald Caesar, known professionally as Cza of REM, is the Nigerian founder and CEO of Royal Empire Management. His work spans artist management, A&amp;R, project direction, and the wider RADARCharts world.
            </p>
            <p className={styles.body}>
              The REM system is built to discover, nurture, and amplify emerging talent while protecting the music and the people around it.
            </p>
            <div className={styles.archiveRow}>
              <span>Abuja, Nigeria</span>
              <span>RADARCharts</span>
              <span>MOTHERLand</span>
              <span>XCAPE</span>
              <span>REM LIVE AID</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
