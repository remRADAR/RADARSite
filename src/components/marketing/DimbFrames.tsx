import type { ReactNode } from "react";
import styles from "./DimbFrames.module.css";

/**
 * The two-frame DuMb opening.
 *
 * On phones the two frames behave as intentionally stacked full-screen
 * experiences: one natural downward scroll moves from the photograph frame to
 * the logotype frame, and scroll-snap keeps each one aligned. On tablets and up
 * the snap is released so the page scrolls normally - mobile viewport heights
 * are never forced onto a desktop.
 */
export function DimbFrames({ children }: { children: ReactNode }) {
  return <div className={styles.frames}>{children}</div>;
}
