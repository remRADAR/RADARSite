import type { LiveFetchResult } from "./audit-engine";

/**
 * Bounded live fetch for the SEO auditor.
 *
 * - Site-origin only: the URL is rebuilt from the validated site path, so
 *   caller input can never redirect the request to another destination.
 * - Hard timeout and a single retry, no redirect loops (fetch follows
 *   redirects; the engine compares final URL to the audited path).
 * - A modest, self-identifying user agent.
 */

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT = "RADAR-SEO-Auditor/1.0 (+https://radarcharts.net)";

export async function fetchPublicPage(path: string): Promise<LiveFetchResult | null> {
  const url = `https://radarcharts.net${path}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
        cache: "no-store",
      });
      const html = await response.text();
      return { finalUrl: response.url || url, status: response.status, html: html.slice(0, 2_000_000) };
    } catch {
      if (attempt === 1) return null;
    }
  }
  return null;
}
