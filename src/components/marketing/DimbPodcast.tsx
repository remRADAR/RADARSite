"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DimbPodcast.module.css";

// Intentionally unset until RADAR supplies the official Spotify show URL/ID.
const SPOTIFY_SHOW_URL_OR_ID = "";
const STREAM_URLS: Record<string, string> = { Instagram: "", YouTube: "", Twitch: "", Kick: "" };
const STREAM_PLATFORMS = Object.keys(STREAM_URLS);
type Episode = { no: string; title: string; guest: string; length: string };
const EPISODES: Episode[] = [
  { no: "001", title: "The records that raised us", guest: "Guest to be announced", length: "—" },
  { no: "002", title: "Crate digging in Lagos after dark", guest: "Guest to be announced", length: "—" },
  { no: "003", title: "Why a bassline outlives a chorus", guest: "Guest to be announced", length: "—" },
  { no: "004", title: "The studio as an instrument", guest: "Guest to be announced", length: "—" },
];
const TRANSCRIPT = [
  { stamp: "00:00", text: "Transcript placeholder. Once the episodes are recorded, the spoken track will be transcribed here and time-linked to the player." },
  { stamp: "00:12", text: "Each line will carry its own timestamp so a listener can jump straight to the part they came for." },
  { stamp: "00:26", text: "Until then this block holds the shape of the reading experience without claiming any words were said." },
];
function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
}
function spotifyEmbedUrl(value: string) {
  const input = value.trim();
  const uriMatch = input.match(/^spotify:show:([A-Za-z0-9]{22})$/);
  if (uriMatch) return `https://open.spotify.com/embed/show/${uriMatch[1]}`;
  if (/^[A-Za-z0-9]{22}$/.test(input)) return `https://open.spotify.com/embed/show/${input}`;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "open.spotify.com") return "";
    const segments = url.pathname.split("/").filter(Boolean);
    const showIndex = segments.indexOf("show");
    const id = showIndex >= 0 ? segments[showIndex + 1] : "";
    return id && /^[A-Za-z0-9]{22}$/.test(id) ? `https://open.spotify.com/embed/show/${id}` : "";
  } catch {
    return "";
  }
}
export function DimbPodcast() {
  const [active, setActive] = useState<Episode | null>(null);
  const [platform, setPlatform] = useState(STREAM_PLATFORMS[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audioRef.current?.pause(), []);
  const select = useCallback((episode: Episode) => setActive(episode), []);
  const streamUrl = safeUrl(STREAM_URLS[platform]);
  const spotifyUrl = spotifyEmbedUrl(SPOTIFY_SHOW_URL_OR_ID);
  return (
    <div className={styles.page}>
      <section className={styles.section} aria-labelledby="dimb-episodes">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / EPISODES</p><h2 id="dimb-episodes" className={styles.title}>Every conversation,<br />in order.</h2></div><p className={styles.note}>Episode index scaffold. Titles, guests, and audio will be connected when the show feed is ready.</p></div>
        <div className={styles.list}>{EPISODES.map((episode) => <button key={episode.no} type="button" className={styles.episode} onClick={() => select(episode)} aria-pressed={active?.no === episode.no}><span className={styles.epNo}>{episode.no}</span><span className={styles.epTitle}>{episode.title}</span><span className={styles.epLen}>{episode.length}</span><span className={styles.epMeta}>{episode.guest}</span></button>)}</div>
      </section>
      <section className={styles.section} aria-labelledby="dimb-listen">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / LISTEN</p><h2 id="dimb-listen" className={styles.title}>Listen on Spotify.</h2></div><p className={styles.note}>Official show embed will appear here when the Spotify show URL or ID is provided.</p></div>
        {spotifyUrl ? <div className={styles.embedFrame}><iframe title="DuMb podcast on Spotify" src={spotifyUrl} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className={styles.embedEmpty} role="status"><strong>Spotify player slot</strong><span>Waiting for the official Spotify show URL or show ID. No player is connected yet.</span></div>}
      </section>
      <section className={styles.section} aria-labelledby="dimb-live">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / LIVE SESSION</p><h2 id="dimb-live" className={styles.title}>Choose the stream.</h2></div><p className={styles.note}>Select a destination to view its live stream when a channel URL is configured. OBS Studio broadcasts to these destinations; it cannot be embedded here.</p></div>
        <label className={styles.selectorLabel} htmlFor="dimb-stream-platform">Stream destination</label>
        <select id="dimb-stream-platform" className={styles.selector} value={platform} onChange={(event) => setPlatform(event.target.value)}>{STREAM_PLATFORMS.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        {streamUrl ? <div className={styles.embedFrame}><iframe title={`${platform} live session`} src={streamUrl} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /></div> : <div className={styles.embedEmpty} role="status"><strong>{platform} destination not configured</strong><span>Add the official channel or embed URL for {platform} to enable its live player. No stream is being shown.</span></div>}
      </section>
      <section className={styles.section} aria-labelledby="dimb-library">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / TO COME</p><h2 id="dimb-library" className={styles.title}>Built out, waiting<br />on the audio.</h2></div><p className={styles.note}>Three surfaces below are laid out and styled but deliberately empty. Each one names what will fill it.</p></div>
        <div className={styles.grid}><div className={styles.slot}><span className={styles.slotTag}>Slot 01</span><div><p className={styles.slotTitle}>Clipping room</p><p className={styles.slotBody}>Short vertical cuts from each episode, cut and captioned, ready to post.</p></div></div><div className={styles.slot}><span className={styles.slotTag}>Slot 02</span><div><p className={styles.slotTitle}>Guest shelf</p><p className={styles.slotBody}>Each guest&apos;s own records, with the one track they brought into the room.</p></div></div><div className={styles.slot}><span className={styles.slotTag}>Slot 03</span><div><p className={styles.slotTitle}>Listen anywhere</p><p className={styles.slotBody}>Spotify, Apple Podcasts, and the RSS feed, once distribution is set up.</p></div></div></div>
      </section>
      <section className={styles.section} aria-labelledby="dimb-read"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / READ ALONG</p><h2 id="dimb-read" className={styles.title}>The transcript<br />sits beside it.</h2></div></div><div className={styles.split}><div>{TRANSCRIPT.map((line) => <div className={styles.transcriptLine} key={line.stamp}><span className={styles.stamp}>{line.stamp}</span><p className={styles.said}>{line.text}</p></div>)}</div><div className={styles.guestCard}><p className={styles.guestName}>Guest slot</p><p className={styles.guestRole}>Not yet booked</p><p className={styles.guestBody}>When a guest is confirmed, their portrait, their role, and the record they chose land here.</p></div></div></section>
      <div className={styles.strip}><p className={styles.stripText}>DuMb / Deep in my bones</p><div className={styles.stripActions}><span className={styles.chip}>RSS soon</span><span className={styles.chip}>Spotify pending</span><span className={styles.chip}>Apple soon</span></div></div>
      <div className={styles.dock}><span className={styles.dockButton} aria-hidden="true">▶</span><div className={styles.dockMeta}><span className={styles.dockTitle}>{active ? active.title : "Podcast player"}</span><span className={styles.dockSub}>{active ? "Episode audio not published" : "Waiting for the official show feed"}</span></div><div className={styles.dockBar} role="progressbar" aria-label="Podcast progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><div className={styles.dockFill} style={{ width: "0%" }} /></div></div>
    </div>
  );
}
