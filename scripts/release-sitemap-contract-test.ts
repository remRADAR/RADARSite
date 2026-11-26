import assert from "node:assert/strict";
import {
  buildReleaseFeedXml,
  buildReleaseSitemapEntries,
  buildReleaseSitemapXml,
  releaseSitemapExcerpt,
  releaseSitemapImage,
  releaseSitemapTitle,
  releaseSitemapUrl,
} from "@/lib/release-sitemap";

/**
 * Contract: every release link gets a sitemap entry with the artwork as the
 * featured image, the "[Artist] - [Song]" title and the stayAKTiV excerpt.
 * The assertions run against the real release data, so a new release that
 * breaks the shape fails here rather than shipping.
 */

// --- the three field builders, in isolation -------------------------------
assert.equal(releaseSitemapTitle({ artist: "Mamuzo", title: "Omolops" }), "Mamuzo - Omolops");
assert.equal(releaseSitemapTitle({ artist: "Erizstar, AdebowaleFire", title: "Look Up" }), "Erizstar, AdebowaleFire - Look Up");
assert.equal(releaseSitemapExcerpt({ artist: "Mamuzo" }), "New Music from Mamuzo stayAKTiV #OnTheRADAR.");
assert.equal(releaseSitemapExcerpt({ artist: "Erizstar, AdebowaleFire" }), "New Music from Erizstar, AdebowaleFire stayAKTiV #OnTheRADAR.");
assert.equal(releaseSitemapUrl({ slug: "omolops" }), "https://radarcharts.net/omolops");
assert.equal(releaseSitemapImage({ coverImage: "/releases/omolops-cover-1080.webp" }), "https://radarcharts.net/releases/omolops-cover-1080.webp");

// --- the real entries -----------------------------------------------------
const entries = await buildReleaseSitemapEntries();
assert.ok(entries.length >= 2, `expected at least the two existing releases, got ${entries.length}`);

const bySlug = new Map(entries.map((entry) => [entry.url.split("/").pop(), entry]));

const omolops = bySlug.get("omolops");
assert.ok(omolops, "Omolops must have a sitemap entry");
assert.equal(omolops.title, "Mamuzo - Omolops");
assert.equal(omolops.excerpt, "New Music from Mamuzo stayAKTiV #OnTheRADAR.");
assert.equal(omolops.image, "https://radarcharts.net/releases/omolops-cover-1080.webp");

const lookUp = bySlug.get("look-up");
assert.ok(lookUp, "Look Up must have a sitemap entry");
assert.equal(lookUp.title, "Erizstar, AdebowaleFire - Look Up");
assert.equal(lookUp.excerpt, "New Music from Erizstar, AdebowaleFire stayAKTiV #OnTheRADAR.");
assert.equal(lookUp.image, "https://radarcharts.net/releases/look-up-cover.webp");

// Every entry, not just the two known ones, must carry all three fields.
for (const entry of entries) {
  assert.match(entry.title, /^.+ - .+$/, `title must be "[Artist] - [Song]": ${entry.title}`);
  assert.match(entry.excerpt, /^New Music from .+ stayAKTiV #OnTheRADAR\.$/, `excerpt shape: ${entry.excerpt}`);
  assert.match(entry.image, /^https:\/\/radarcharts\.net\/.+\.(?:webp|jpe?g|png)$/i, `artwork must be an absolute image URL: ${entry.image}`);
  assert.match(entry.url, /^https:\/\/radarcharts\.net\/[a-z0-9-]+$/, `url shape: ${entry.url}`);
}

// --- sitemap XML ----------------------------------------------------------
const sitemap = buildReleaseSitemapXml(entries);
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
assert.match(sitemap, /xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/);
assert.match(sitemap, /<image:loc>https:\/\/radarcharts\.net\/releases\/omolops-cover-1080\.webp<\/image:loc>/);
assert.match(sitemap, /<image:title>Mamuzo - Omolops<\/image:title>/);
assert.match(sitemap, /<news:title>Erizstar, AdebowaleFire - Look Up<\/news:title>/);
assert.equal((sitemap.match(/<url>/g) || []).length, entries.length, "one <url> per release");

// --- feed XML -------------------------------------------------------------
const feed = buildReleaseFeedXml(entries);
assert.match(feed, /<rss version="2\.0"/);
assert.match(feed, /<description>New Music from Mamuzo stayAKTiV #OnTheRADAR\.<\/description>/);
assert.match(feed, /<description>New Music from Erizstar, AdebowaleFire stayAKTiV #OnTheRADAR\.<\/description>/);
assert.match(feed, /<media:content url="https:\/\/radarcharts\.net\/releases\/look-up-cover\.webp" medium="image" \/>/);
assert.equal((feed.match(/<item>/g) || []).length, entries.length, "one <item> per release");

// --- XML escaping ---------------------------------------------------------
const escaped = buildReleaseSitemapXml([{
  url: "https://radarcharts.net/a-b",
  title: "A & B - C <D>",
  excerpt: "New Music from A & B stayAKTiV #OnTheRADAR.",
  image: "https://radarcharts.net/x.webp",
  releaseDate: "2026-11-27",
}]);
assert.match(escaped, /<image:title>A &amp; B - C &lt;D&gt;<\/image:title>/);
assert.doesNotMatch(escaped, /<image:title>A & B/);

console.log(`release-sitemap contract: OK (${entries.length} releases, ${entries.map((e) => e.title).join(" | ")})`);
