import { listArtistProfiles, scrapeReleaseSource, updateArtistProfileSignature, upsertReleaseLink, type ArtistProfile, type ReleaseLink } from "@/lib/release-links";

const MAX_PROFILE_BYTES = 2_000_000;
const MAX_CANDIDATES = 12;
function absolute(value: string, base: URL) { try { return new URL(value, base).toString(); } catch { return ""; } }
function releaseCandidates(html: string, base: URL) {
  const urls = new Set<string>();
  const re = /(?:href|content|url)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(re)) { const url = absolute(match[1], base); if (/\/releases\/links\?(?:[^"']*&)?id=\d+/i.test(url)) urls.add(url); if (urls.size >= MAX_CANDIDATES) break; }
  if (/\/releases\/links\?(?:[^"']*&)?id=\d+/i.test(base.toString())) urls.add(base.toString());
  return [...urls].slice(0, MAX_CANDIDATES);
}
async function readProfile(profile: ArtistProfile) {
  const monitorUrl = new URL(profile.monitorUrl);
  const response = await fetch(monitorUrl, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { accept: "text/html,application/xhtml+xml,application/json", "user-agent": "RADARMusic-ReleaseDetector/1.0" } });
  if (!response.ok) throw new Error(`${profile.platform} monitor returned HTTP ${response.status}`);
  const html = await response.text();
  if (html.length > MAX_PROFILE_BYTES) throw new Error(`${profile.platform} monitor response exceeded the safety limit`);
  const signature = `${html.length}:${html.slice(0, 160)}:${html.slice(-160)}`;
  return { html, signature, candidates: releaseCandidates(html, monitorUrl) };
}
export type DetectorResult = { profilesChecked: number; candidatesFound: number; releasesUpdated: ReleaseLink[]; errors: { profile: string; error: string }[] };
export async function runReleaseDetector(): Promise<DetectorResult> {
  const profiles = await listArtistProfiles();
  const result: DetectorResult = { profilesChecked: profiles.length, candidatesFound: 0, releasesUpdated: [], errors: [] };
  for (const profile of profiles) {
    try {
      const snapshot = await readProfile(profile);
      await updateArtistProfileSignature(profile.id, snapshot.signature);
      result.candidatesFound += snapshot.candidates.length;
      for (const sourceUrl of snapshot.candidates) {
        try { const scraped = await scrapeReleaseSource(sourceUrl); const release = await upsertReleaseLink({ ...scraped, artist: scraped.artist || profile.artistName, artistKey: profile.artistKey, detectedBy: `${profile.platform}:${profile.profileUrl}` }); result.releasesUpdated.push(release); } catch (error) { result.errors.push({ profile: `${profile.artistName} / ${profile.platform}`, error: error instanceof Error ? error.message : "Release scrape failed" }); }
      }
    } catch (error) { result.errors.push({ profile: `${profile.artistName} / ${profile.platform}`, error: error instanceof Error ? error.message : "Profile monitor failed" }); }
  }
  return result;
}
