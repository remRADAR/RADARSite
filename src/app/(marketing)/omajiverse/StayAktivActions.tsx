"use client";

import { useEffect, useState } from "react";
import styles from "./StayAktiv.module.css";

type CountdownValue = { days: number; hours: number; minutes: number; seconds: number; isLive: boolean };
const ZERO: CountdownValue = { days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false };
const EVENT_START = "2026-12-10T18:00:00+01:00";
const EVENT_END = "2026-12-10T22:00:00+01:00";
const EVENT_TITLE = "OMAJI VERSE 2.0";
const EVENT_LOCATION = "Liquid Café, City Park Wuse, Abuja, Nigeria";
const EVENT_DESCRIPTION = "The annual end of year clarion call by Abuja’s renowned artist, OMAJI.";

function getRemaining(targetMs: number, nowMs = Date.now()): CountdownValue {
  const totalSeconds = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    isLive: nowMs >= targetMs,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function googleCalendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: EVENT_TITLE,
    dates: "20261210T180000/20261210T220000",
    details: EVENT_DESCRIPTION,
    location: EVENT_LOCATION,
    ctz: "Africa/Lagos",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadAppleCalendar() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//remRADAR//stayAKTiV//EN",
    "BEGIN:VEVENT",
    "UID:omaji-verse-2@stayaktiv.remradar",
    "DTSTAMP:20261108T090000Z",
    "DTSTART;TZID=Africa/Lagos:20261210T180000",
    "DTEND;TZID=Africa/Lagos:20261210T220000",
    `SUMMARY:${EVENT_TITLE}`,
    `DESCRIPTION:${EVENT_DESCRIPTION}`,
    `LOCATION:${EVENT_LOCATION}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "omaji-verse-2.ics";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function StayAktivActions() {
  const [remaining, setRemaining] = useState<CountdownValue>(ZERO);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const targetMs = Date.parse(EVENT_START);
    const update = () => setRemaining(getRemaining(targetMs));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    [remaining.days, "Days"],
    [remaining.hours, "Hours"],
    [remaining.minutes, "Minutes"],
    [remaining.seconds, "Seconds"],
  ] as const;

  return (
    <section className={styles.actionZone} aria-label="Event actions and countdown">
      <div className={styles.countdown} data-countdown data-countdown-target={EVENT_START}>
        <div className={styles.countdownHeader}>
          <div>
            <p className={styles.countdownEyebrow}>OMAJI VERSE 2.0 / EVENT CLOCK</p>
            <h2 className={styles.countdownTitle}>{remaining.isLive ? "We are live." : "Until the doors open."}</h2>
          </div>
          <p className={styles.countdownMeta}>10 DECEMBER / 6PM / WAT</p>
        </div>
        <div className={styles.countdownGrid} aria-live="polite" aria-atomic="true">
          {units.map(([value, label]) => (
            <div className={styles.countdownUnit} key={label}>
              <strong>{pad(value)}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionRule} aria-hidden="true" />
        <div className={styles.actionButtons}>
          <div className={styles.actionControl}>
            <button type="button" className={styles.actionButton} onClick={() => { setScheduleOpen((open) => !open); setMapOpen(false); }} aria-expanded={scheduleOpen}>
              Set schedule <span aria-hidden="true">↗</span>
            </button>
            {scheduleOpen && (
              <div className={styles.actionPopover} role="menu">
                <p>Choose your calendar</p>
                <a href={googleCalendarUrl()} target="_blank" rel="noreferrer" role="menuitem">Google Calendar</a>
                <button type="button" onClick={downloadAppleCalendar} role="menuitem">Apple / iOS calendar</button>
              </div>
            )}
          </div>
          <span className={styles.actionDivider} aria-hidden="true" />
          <div className={styles.actionControl}>
            <button type="button" className={styles.actionButton} onClick={() => { setMapOpen((open) => !open); setScheduleOpen(false); }} aria-expanded={mapOpen}>
              Map location <span aria-hidden="true">↗</span>
            </button>
            {mapOpen && (
              <div className={styles.actionPopover} role="menu">
                <p>Liquid Café / City Park Wuse</p>
                <a href="https://www.google.com/maps/dir/?api=1&destination=Liquid%20Cafe%2C%20City%20Park%20Wuse%2C%20Abuja%2C%20Nigeria" target="_blank" rel="noreferrer" role="menuitem">Get directions</a>
              </div>
            )}
          </div>
        </div>
        <div className={styles.actionRule} aria-hidden="true" />
      </div>
      <p className={styles.actionHint}>Save the date or get directions to the highlighted event.</p>
    </section>
  );
}

export { EVENT_END };
