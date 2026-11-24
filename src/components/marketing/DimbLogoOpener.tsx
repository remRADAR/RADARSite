"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./DimbLogoOpener.module.css";

export function DimbLogoOpener() {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className={styles.opener + (inView ? " " + styles.openerIn : "")}
      aria-label="DuMb logotype"
    >
      <div className={styles.inner}>
        <Image className={styles.suppliedLogo} src="/media/podcast/logo.gif" alt="DuMb — Deep in my bones" width={796} height={796} unoptimized />

        <div aria-hidden="true" className={styles.rule} />
        <p className={styles.strap}>Deep in my bones</p>
      </div>
    </section>
  );
}
