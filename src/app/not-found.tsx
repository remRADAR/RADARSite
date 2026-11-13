import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="main-content" className={styles.page}>
      <Image
        src="/images/errors/remradar-404.webp"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className={styles.backgroundImage}
      />
      <div aria-hidden="true" className={styles.scrim} />
      <Link href="/" className={styles.fallback}>
        Return home <ArrowUpRight aria-hidden size={15} />
      </Link>
    </main>
  );
}
