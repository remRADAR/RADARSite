/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { buildPageMetadata } from "@/lib/seo";
import { StayAktivActions } from "./StayAktivActions";
import styles from "./StayAktiv.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "stayAKTiV",
  description: "A live events lane for music, culture, and the people moving it forward.",
  path: "/stayaktiv",
});

const featuredEvent = {
  slug: "omaji-verse-2",
  title: "OMAJI VERSE 2.0",
  artist: "OMAJI",
  location: "LIQUID CAFÉ / CITY PARK WUSE, ABUJA",
  date: "10TH DECEMBER",
  time: "6PM PROMPT",
  accent: "#a8e51f",
  accentRgb: "168, 229, 31",
  poster: "/events/omaji-verse-2-poster.png",
  description: "The annual end of year clarion call by Abuja’s renowned artist, OMAJI.",
};

const eventTheme = {
  "--event-accent": featuredEvent.accent,
  "--event-accent-rgb": featuredEvent.accentRgb,
} as CSSProperties;

const tickerLogos = [
  ["/stayaktiv/tickers/omaji-verse-2.png", "OMAJI VERSE 2.0", styles.tickerLogoOmaji],
  ["/stayaktiv/tickers/last-thursdays.png", "THE LAST THURSDAYS", styles.tickerLogoLast],
  ["/stayaktiv/tickers/release-radar-reel.png", "RELEASE RADAR REEL", styles.tickerLogoRelease],
] as const;

export default function StayAktivPage() {
  return (
    <>
      <ArchiveStructuredData
        name="stayAKTiV"
        description="A live events lane for music, culture, and the people moving it forward."
        path="/stayaktiv"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "stayAKTiV", path: "/stayaktiv" }]}
      />

      <main className={styles.canvas} style={eventTheme} data-event={featuredEvent.slug}>
        <div className={`${styles.rail} ${styles.topRail}`} aria-label="Active event ticker">
          <div className={styles.railInner}>
            {[...tickerLogos, ...tickerLogos].map(([src, alt, className], index) => (
              <span className={`${styles.tickerLogoMark} ${className}`} key={`${src}-${index}`}>
                <Image src={src} alt={alt} width={320} height={64} priority={index < 3} unoptimized />
              </span>
            ))}
          </div>
        </div>

        <section className={styles.hero} aria-labelledby="stayaktiv-title">
          <h1 id="stayaktiv-title" className="sr-only">stayAKTiV events</h1>
          <div className={styles.posterWrap} data-testid="floating-event-poster">
            <img
              src={featuredEvent.poster}
              alt={`${featuredEvent.title} event poster`}
              sizes="(min-width: 700px) 32rem, 72vw"
              className={styles.poster}
            />
          </div>
          <p className={styles.heroStamp}>Active event<strong>{featuredEvent.artist}</strong>{featuredEvent.date} / {featuredEvent.time}</p>
        </section>

        <section className={styles.cards} id="event-details" aria-label="Promoted events">
          <article className={`${styles.card} ${styles.cardPrimary}`}>
            <div className={styles.cardTopline}>
              <span>Promoted event / 01</span>
              <span>{featuredEvent.date}</span>
            </div>
            <p className={styles.eventMark}>{featuredEvent.title}</p>
            <h2 className={styles.cardTitle}>The annual end of year clarion call.</h2>
            <p className={styles.cardCopy}>{featuredEvent.description}</p>
            <Link className={styles.cardLink} href={`/stayaktiv/events/${featuredEvent.slug}`}>
              View more ↗
            </Link>
          </article>

          <article className={`${styles.card} ${styles.cardSecondary}`} aria-label="Add another promoted event">
            <div>
              <div className={styles.cardTopline}><span>stayAKTiV / open slot</span><span>02</span></div>
              <div className={styles.placeholderLine} aria-hidden />
            </div>
            <p className={styles.placeholderCopy}>More promoted events can land here. One active event keeps the hero focused.</p>
          </article>
        </section>

        <StayAktivActions />

        <p className={styles.footerNote}>The active event sets the color, type, ticker, and ticket path.</p>
      </main>
    </>
  );
}
