import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArchiveStructuredData } from "@/components/marketing/ArchiveStructuredData";
import { EventArchiveHero } from "@/components/marketing/EventArchiveHero";
import { buildPageMetadata } from "@/lib/seo";
import styles from "./StayAktivArchive.module.css";

const omajiVerse = {
  slug: "omaji-verse-2",
  title: "OMAJIVERSE",
  kicker: "OMAJI VERSE 2.0",
  date: "10TH DECEMBER / 6PM PROMPT",
  location: "LIQUID CAFÉ / CITY PARK WUSE, ABUJA",
  description: "The annual end of year clarion call by Abuja’s renowned artist, OMAJI.",
  poster: "/events/omaji-verse-2-poster.png",
};

export const metadata: Metadata = buildPageMetadata({
  title: "stayAKTiV",
  description: "Live rooms, listening sessions, and the next places where culture moves.",
  path: "/stayaktiv",
  image: omajiVerse.poster,
});

const tickerLogos = [
  ["/stayaktiv/tickers/omaji-verse-2.png", "OMAJI VERSE 2.0"],
  ["/stayaktiv/tickers/last-thursdays.png", "THE LAST THURSDAYS"],
  ["/stayaktiv/tickers/release-radar-reel.png", "RELEASE RADAR REEL"],
] as const;

export default function StayAktivArchivePage() {
  return (
    <>
      <ArchiveStructuredData
        name="stayAKTiV"
        description="Live rooms, listening sessions, and the next places where culture moves."
        path="/stayaktiv"
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "stayAKTiV", path: "/stayaktiv" }]}
      />
      <main className={styles.page}>
        <EventArchiveHero />
        <div className={styles.ticker} aria-label="stayAKTiV event ticker">
          <div className={styles.tickerTrack}>
            {[...tickerLogos, ...tickerLogos].map(([src, alt], index) => (
              <span className={styles.tickerItem} key={`${src}-${index}`}>
                <Image src={src} alt={alt} width={320} height={64} unoptimized />
                {index < tickerLogos.length * 2 - 1 ? <span className={styles.tickerRule} aria-hidden="true" /> : null}
              </span>
            ))}
          </div>
        </div>
        <section className={styles.archive} aria-labelledby="event-archive-heading">
          <div className={styles.archiveHeader}>
            <p className={styles.eyebrow}>(01 / Featured event)</p>
            <h2 id="event-archive-heading">The event archive<span>.</span></h2>
            <p>One focused event, presented as a complete world. More event rooms can be added without changing the template.</p>
          </div>
          <article className={styles.eventCard}>
            <div className={styles.posterFrame}>
              <Image src={omajiVerse.poster} alt="OMAJI VERSE 2.0 event poster" fill sizes="(min-width: 900px) 42vw, 100vw" className={styles.poster} priority />
            </div>
            <div className={styles.eventInfo}>
              <p className={styles.eyebrow}>{omajiVerse.kicker}</p>
              <h3>{omajiVerse.title}<span>.</span></h3>
              <p className={styles.eventDescription}>{omajiVerse.description}</p>
              <dl>
                <div><dt>When</dt><dd>{omajiVerse.date}</dd></div>
                <div><dt>Where</dt><dd>{omajiVerse.location}</dd></div>
              </dl>
              <Link href="/omajiverse" className={styles.openEvent}>Open OMAJIVERSE <span aria-hidden="true">↗</span></Link>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
