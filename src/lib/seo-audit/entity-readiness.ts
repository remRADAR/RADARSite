import type { CmsRecord, ContentCollections } from "@/lib/content-server";
import type { AuditFinding } from "./types";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function recordPath(collection: string, slug: string) {
  switch (collection) {
    case "artists": return `/radarmusic/artists/${slug}`;
    case "releases": return `/radarmusic/releases/${slug}`;
    default: return "";
  }
}

function nameIndex(records: CmsRecord[], collection: "artists" | "releases"): Map<string, string> {
  const index = new Map<string, string>();
  for (const record of records) {
    const slug = text(record.slug);
    if (!slug) continue;
    const path = recordPath(collection, slug);
    if (!path) continue;
    for (const name of new Set([text(record.name), text(record.title), text(record.artist)].filter(Boolean))) {
      if (name.length >= 3) index.set(name.toLowerCase(), path);
    }
  }
  return index;
}

/**
 * Music-entity readiness for the future RADARMatrix knowledge graph.
 *
 * Verified entity fields (sourceArtistName, sourceSongName,
 * sourceReleaseName) are treated as documented facts supplied by the CMS.
 * Name co-occurrence in article bodies is only ever reported as an
 * unverified candidate requiring editorial confirmation — it is never
 * treated as a verified credit.
 */
export function collectMusicEntityFindings(input: {
  record: CmsRecord;
  bodyText: string;
  bodyLinks: string[];
  content: ContentCollections;
  liveJsonLdTypes?: string[];
}): AuditFinding[] {
  const { record, bodyText, bodyLinks, content } = input;
  const findings: AuditFinding[] = [];
  const artistsByName = nameIndex(content.artists as CmsRecord[], "artists");
  const releasesByName = nameIndex(content.releases as CmsRecord[], "releases");

  const verifiedEntities = [
    { key: "sourceArtistName", label: "artist", value: text(record.sourceArtistName) },
    { key: "sourceSongName", label: "song", value: text(record.sourceSongName) },
    { key: "sourceReleaseName", label: "release", value: text(record.sourceReleaseName) },
  ].filter((entity) => entity.value);

  if (verifiedEntities.length) {
    findings.push({
      id: "music-entity-verified-fields",
      category: "music-entities",
      severity: "info",
      title: "Documented music entity references present",
      description: "The CMS record carries documented entity fields that can seed RADARMatrix relationships.",
      evidence: verifiedEntities.map((entity) => `${entity.label}: ${entity.value}`).join("; ").slice(0, 400),
      recommendation: "Keep these fields authoritative; expose them to RADARMatrix when the knowledge-graph integration lands.",
      status: "open",
      autoFixable: false,
    });
  }

  const linkText = bodyLinks.join(" ").toLowerCase();
  for (const entity of verifiedEntities) {
    if (entity.key !== "sourceArtistName" && entity.key !== "sourceReleaseName") continue;
    const matchPath = entity.key === "sourceArtistName"
      ? artistsByName.get(entity.value.toLowerCase())
      : releasesByName.get(entity.value.toLowerCase());
    if (matchPath && !linkText.includes(matchPath.toLowerCase())) {
      findings.push({
        id: entity.key === "sourceArtistName" ? "music-entity-link-artist" : "music-entity-link-release",
        category: "internal-links",
        severity: "recommendation",
        title: "Documented entity has a matching page that is not linked",
        description: `The record documents ${entity.label} "${entity.value}" and a matching site page exists, but the body does not link to it.`,
        evidence: `Candidate target: ${matchPath}`,
        recommendation: `Consider linking "${entity.value}" to ${matchPath} in the article body.`,
        status: "open",
        autoFixable: false,
      });
    }
  }

  if (!verifiedEntities.length) {
    const lowered = bodyText.toLowerCase();
    const candidates = new Map<string, string>();
    for (const [name, path] of artistsByName) {
      if (candidates.size >= 5) break;
      if (lowered.includes(name)) candidates.set(name, path);
    }
    for (const [name, path] of candidates) {
      findings.push({
        id: "music-entity-candidate-unverified",
        category: "music-entities",
        severity: "recommendation",
        title: "Possible artist reference requires editorial verification",
        description: `The body mentions "${name}", which matches an artist page, but the record has no documented entity fields. This is a candidate only — it is not a verified credit and must not be stored as one.`,
        evidence: `Matching artist page: ${path}`,
        recommendation: `If the reference is accurate, populate the documented entity fields for "${name}" after editorial confirmation.`,
        status: "open",
        autoFixable: false,
      });
    }
  }

  if (typeof input.liveJsonLdTypes !== "undefined") {
    const types = new Set(input.liveJsonLdTypes.map((type) => type.toLowerCase()));
    const wantsMusicSchema = Boolean(text(record.sourceArtistName)) || Boolean(text(record.sourceReleaseName)) || content.artists.some((artist) => artist.slug === record.slug);
    if (wantsMusicSchema && !types.has("musicgroup") && !types.has("musicalbum") && !types.has("musicrecording")) {
      findings.push({
        id: "music-schema-opportunity",
        category: "structured-data",
        severity: "recommendation",
        title: "Music entity schema opportunity",
        description: "The page documents music entities but emits no MusicGroup/MusicAlbum/MusicRecording schema. Only add schema that accurately reflects visible page content.",
        evidence: `JSON-LD types observed: ${[...input.liveJsonLdTypes].join(", ") || "none"}`,
        recommendation: "Consider MusicGroup (artist pages) or MusicRecording/MusicRelease (release pages) once credits are verified.",
        status: "open",
        autoFixable: false,
      });
    }
  }

  return findings;
}
