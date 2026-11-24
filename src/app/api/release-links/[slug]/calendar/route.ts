import { NextRequest, NextResponse } from "next/server";
import { getFallbackReleaseLink } from "@/lib/release-fallback";

export const dynamic = "force-dynamic";
function escapeIcs(value: string) { return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
function icsDate(value: string, days = 0) { const date = new Date(`${value}T00:00:00+01:00`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params; const release = getFallbackReleaseLink(slug);
  if (!release) return new NextResponse("Release not found", { status: 404 });
  const start = icsDate(release.releaseDate); const end = icsDate(release.releaseDate, 1);
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RADARMusic//Release Links//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:radarmusic-${release.slug}@radarcharts.net`, `DTSTAMP:${start}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escapeIcs(`${release.title} — ${release.artist} release`)}`, `DESCRIPTION:${escapeIcs(`Release day for ${release.title} by ${release.artist}. Listen at https://music.radarcharts.net/${release.slug}`)}`, `URL:https://music.radarcharts.net/${release.slug}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  return new NextResponse(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="${release.slug}.ics"`, "cache-control": "public, max-age=300" } });
}
