"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DimbPodcast.module.css";

// PLACEHOLDER DATA: the episode list, transcript and guest panel are scaffolds.
// They are intentionally labelled as such on screen until the RSS feed and the
// recorded episodes are wired in. No real episode audio ships yet, so the dock
// plays the same placeholder welcome file the opener uses.
const PLACEHOLDER_AUDIO = "/media/podcast-welcome.mp3";

type Episode = {
  no: string;
  title: string;
  guest: string;
  length: string;
};

const EPISODES: Episode[] = [
  { no: "001", title: "The records that raised us", guest: "Guest to be announced", length: "—" },
  { no: "002", title: "Crate digging in Lagos after dark", guest: "Guest to be announced", length: "—" },
  { no: "003", title: "Why a bassline outlives a chorus", guest: "Guest to be announced", length: "—" },
  { no: "004", title: "The studio as an instrument", guest: "Guest to be announced", length: "—" },
];

const TRANSCRIPT: { stamp: string; text: string }[] = [
  { stamp: "00:00", text: "Transcript placeholder. Once the episodes are recorded, the spoken track will be transcribed here and time-linked to the player." },
  { stamp: "00:12", text: "Each line will carry its own timestamp so a listener can jump straight to the part they came for." },
  { stamp: "00:26", text: "Until then this block holds the shape of the reading experience without claiming any words were said." },
];

export function DimbPodcast() {
  const [active, setActive] = useState<Episode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(PLACEHOLDER_AUDIO);
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => {
      if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.pause();
    };
  }, []);

  const select = useCallback((episode: Episode) => {
    setActive(episode);
    setPlaying(false);
    setProgress(0);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.pause();
    }
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [playing]);

  return (
    <div className={styles.page}>
      <section className={styles.section} aria-labelledby="dimb-episodes">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>DIMB / EPISODES</p>
            <h2 id="dimb-episodes" className={styles.title}>
              Every conversation,
              <br />
              in order.
            </h2>
          </div>
          <p className={styles.note}>
            Placeholder episode index. Titles and guests below are scaffolding for the
            layout; real episodes arrive with the feed integration.
          </p>
        </div>

        <div className={styles.list}>
          {EPISODES.map((episode) => (
            <button
              key={episode.no}
              type="button"
              className={styles.episode}
              onClick={() => select(episode)}
              aria-pressed={active?.no === episode.no}
            >
              <span className={styles.epNo}>{episode.no}</span>
              <span className={styles.epTitle}>{episode.title}</span>
              <span className={styles.epLen}>{episode.length}</span>
              <span className={styles.epMeta}>{episode.guest}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="dimb-library">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>DIMB / TO COME</p>
            <h2 id="dimb-library" className={styles.title}>
              Built out, waiting
              <br />
              on the audio.
            </h2>
          </div>
          <p className={styles.note}>
            Three surfaces below are laid out and styled but deliberately empty. Each one
            names what will fill it.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.slot}>
            <span className={styles.slotTag}>Slot 01</span>
            <div>
              <p className={styles.slotTitle}>Clipping room</p>
              <p className={styles.slotBody}>
                Short vertical cuts from each episode, cut and captioned, ready to post.
              </p>
            </div>
          </div>
          <div className={styles.slot}>
            <span className={styles.slotTag}>Slot 02</span>
            <div>
              <p className={styles.slotTitle}>Guest shelf</p>
              <p className={styles.slotBody}>
                Each guest&apos;s own records, with the one track they brought into the room.
              </p>
            </div>
          </div>
          <div className={styles.slot}>
            <span className={styles.slotTag}>Slot 03</span>
            <div>
              <p className={styles.slotTitle}>Listen anywhere</p>
              <p className={styles.slotBody}>
                Spotify, Apple Podcasts, and the RSS feed, once distribution is set up.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="dimb-read">
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>DIMB / READ ALONG</p>
            <h2 id="dimb-read" className={styles.title}>
              The transcript
              <br />
              sits beside it.
            </h2>
          </div>
        </div>

        <div className={styles.split}>
          <div>
            {TRANSCRIPT.map((line) => (
              <div className={styles.transcriptLine} key={line.stamp}>
                <span className={styles.stamp}>{line.stamp}</span>
                <p className={styles.said}>{line.text}</p>
              </div>
            ))}
          </div>
          <div className={styles.guestCard}>
            <p className={styles.guestName}>Guest slot</p>
            <p className={styles.guestRole}>Not yet booked</p>
            <p className={styles.guestBody}>
              When a guest is confirmed, their portrait, their role, and the record they
              chose land here.
            </p>
          </div>
        </div>
      </section>

      <div className={styles.strip}>
        <p className={styles.stripText}>DIMB / Deep in my bones</p>
        <div className={styles.stripActions}>
          <span className={styles.chip}>RSS soon</span>
          <span className={styles.chip}>Spotify soon</span>
          <span className={styles.chip}>Apple soon</span>
        </div>
      </div>

      <div className={styles.dock}>
        <button
          type="button"
          className={styles.dockButton}
          onClick={toggle}
          aria-label={playing ? "Pause preview audio" : "Play preview audio"}
        >
          <span aria-hidden="true">{playing ? "II" : "▶"}</span>
        </button>
        <div className={styles.dockMeta}>
          <span className={styles.dockTitle}>
            {active ? active.title : "Preview audio \u00b7 placeholder"}
          </span>
          <span className={styles.dockSub}>
            {active ? "Episode audio not published" : "Nothing selected"}
          </span>
        </div>
        <div
          className={styles.dockBar}
          role="progressbar"
          aria-label="Preview progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div className={styles.dockFill} style={{ width: progress + "%" }} />
        </div>
      </div>
    </div>
  );
}
