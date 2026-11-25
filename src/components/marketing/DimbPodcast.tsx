"use client";
import { useState } from "react";
import styles from "./DimbPodcast.module.css";

// Intentionally unset until RADAR supplies the official Spotify show URL/ID.
const SPOTIFY_SHOW_URL_OR_ID = "";
// DuMb live television. OBS Studio sends the broadcast to these platforms;
// paste each destination's embed URL here and the television carries the
// channel the moment it goes live. An empty string renders that destination
// as off air. For Twitch embeds, append the site host as the `parent` query
// parameter (Twitch requires it).
const LIVE_STREAM_URLS: Record<string, string> = { Instagram: "", YouTube: "", Twitch: "", Kick: "" };
const LIVE_PLATFORMS = Object.keys(LIVE_STREAM_URLS);
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
  const [platform, setPlatform] = useState(LIVE_PLATFORMS[0]);
  const streamUrl = safeUrl(LIVE_STREAM_URLS[platform]);
  const spotifyUrl = spotifyEmbedUrl(SPOTIFY_SHOW_URL_OR_ID);
  return (
    <div className={styles.page}>
      <section className={styles.section} aria-labelledby="dimb-live">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / LIVE TV</p><h2 id="dimb-live" className={styles.title}>The podcast is<br />a television.</h2></div><p className={styles.note}>DuMb episodes air as live television. OBS Studio sends the broadcast; when the show goes live, the screen below carries it in this space.</p></div>
        <div className={styles.tvBar}>
          <div>
            <label className={styles.selectorLabel} htmlFor="dimb-stream-platform">Channel</label>
            <select id="dimb-stream-platform" className={styles.selector} value={platform} onChange={(event) => setPlatform(event.target.value)}>{LIVE_PLATFORMS.map((name) => <option key={name} value={name}>{name}</option>)}</select>
          </div>
          {streamUrl ? (
            <p className={styles.liveBadge}><span aria-hidden="true" className={styles.livePip} />On air / {platform}</p>
          ) : (
            <p className={styles.offBadge}>Off air</p>
          )}
        </div>
        <div className={styles.tv}>
          <div className={styles.tvScreen}>
            {streamUrl ? (
              <iframe title={`${platform} live television`} src={streamUrl} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
            ) : (
              <div className={styles.tvOff} role="status">
                <p className={styles.tvOffTitle}>DuMb Television</p>
                <p className={styles.tvOffBody}>This screen is the live television slot for the podcast episodes. It stays dark until OBS Studio starts the broadcast; when the show goes live, the episode plays right here.</p>
              </div>
            )}
          </div>
          <div className={styles.tvDeck}><span className={styles.tvDeckText}>DuMb / LIVE</span><span className={styles.tvDeckText}>{platform}</span></div>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="dimb-listen">
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / TO COME</p><h2 id="dimb-library" className={styles.title}>Built out, waiting<br />on the audio.</h2></div><p className={styles.note}>Three surfaces below are laid out and styled but deliberately empty. Each one names what will fill it.</p></div>
        <div className={styles.grid}><div className={styles.slot}><span className={styles.slotTag}>Slot 01</span><div><p className={styles.slotTitle}>Clipping room</p><p className={styles.slotBody}>Short vertical cuts from each episode, cut and captioned, ready to post.</p></div></div><div className={styles.slot}><span className={styles.slotTag}>Slot 02</span><div><p className={styles.slotTitle}>Guest shelf</p><p className={styles.slotBody}>Each guest&apos;s own records, with the one track they brought into the room.</p></div></div><div className={styles.slot}><span className={styles.slotTag}>Slot 03</span><div><p className={styles.slotTitle}>Listen anywhere</p><p className={styles.slotBody}>Spotify, Apple Podcasts, and the RSS feed, once distribution is set up.</p></div></div></div>
      </section>
      <section className={styles.section} aria-labelledby="dimb-read"><div className={styles.sectionHead}><div><p className={styles.eyebrow}>DuMb / READ ALONG</p><h2 id="dimb-read" className={styles.title}>The transcript<br />sits beside it.</h2></div></div><div className={styles.split}><div>{TRANSCRIPT.map((line) => <div className={styles.transcriptLine} key={line.stamp}><span className={styles.stamp}>{line.stamp}</span><p className={styles.said}>{line.text}</p></div>)}</div><div className={styles.guestCard}><p className={styles.guestName}>Guest slot</p><p className={styles.guestRole}>Not yet booked</p><p className={styles.guestBody}>When a guest is confirmed, their portrait, their role, and the record they chose land here.</p></div></div></section>
      <div className={styles.strip}><p className={styles.stripText}>DuMb / Deep in my bones</p><div className={styles.stripActions}><span className={styles.chip}>RSS soon</span><span className={styles.chip}>Spotify pending</span><span className={styles.chip}>Apple soon</span></div></div>
    </div>
  );
}
