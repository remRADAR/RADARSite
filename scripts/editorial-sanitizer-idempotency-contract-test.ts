import assert from "node:assert/strict";
import { sanitizeEditorialHtml } from "@/lib/editorial-migration";

/**
 * Regression: sanitizeEditorialHtml must be idempotent.
 *
 * The function runs more than once on the same body — once when Studio writes
 * the record, again when the article renders, and a third time on the Notion
 * publish path (renderNotionBlockTree -> normalizeArticleInput -> render).
 * Before this test existed, each pass wrapped every iframe in a fresh
 * `.editorial-embed` div and appended another `loading`/`referrerpolicy` pair,
 * while the closing `</div>` of the previous wrapper survived because `div` is
 * not in the tag allowlist. The result was an orphan `</div>` and duplicated
 * attributes — the defect visible on the NEOMAH article.
 */

const counts = (html: string) => {
  const count = (re: RegExp) => (html.match(re) || []).length;
  return {
    divOpen: count(/<div\b/gi),
    divClose: count(/<\/div>/gi),
    iframeOpen: count(/<iframe\b/gi),
    iframeClose: count(/<\/iframe>/gi),
  };
};

const spotifyBody = `<p>Intro</p><figure><img src="https://example.test/art.webp" alt="Artwork"></figure><div class="editorial-embed editorial-embed--spotify-large"><iframe src="https://open.spotify.com/embed/album/1bZ8GFyb6spnlgsrNQBG9i" title="Spotify album player" width="100%" height="352" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div><p>Outro</p>`;

// 1. A clean body stays byte-identical across repeated passes.
const once = sanitizeEditorialHtml(spotifyBody);
const twice = sanitizeEditorialHtml(once);
const thrice = sanitizeEditorialHtml(twice);
assert.equal(twice, once, "second pass must not change the body");
assert.equal(thrice, once, "third pass must not change the body");

// 2. Exactly one wrapper and one iframe survive, with balanced divs.
const shape = counts(thrice);
assert.equal(shape.divOpen, 1, "one embed wrapper");
assert.equal(shape.divClose, 1, "wrapper must be closed exactly once");
assert.equal(shape.iframeOpen, 1, "one iframe");
assert.equal(shape.iframeClose, 1, "iframe must be closed exactly once");

// 3. No attribute is duplicated on the iframe.
const iframe = thrice.match(/<iframe[^>]*>/i)?.[0] || "";
assert.equal((iframe.match(/\bsrc=/gi) || []).length, 1, "one src");
assert.equal((iframe.match(/\bloading=/gi) || []).length, 1, "one loading");
assert.equal((iframe.match(/\breferrerpolicy=/gi) || []).length, 1, "one referrerpolicy");

// 4. A body that already carries the historical damage is repaired, not worsened.
const damaged = `<p>Intro</p><div class="editorial-embed editorial-embed--spotify-track"><iframe src="https://open.spotify.com/embed/track/1Bcm6pchsDmdcwPHWwkz97" title="No Stress" loading="lazy" allow="autoplay" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div><p>Outro</p>`;
const repaired = sanitizeEditorialHtml(damaged);
const repairedShape = counts(repaired);
assert.equal(repairedShape.divOpen, repairedShape.divClose, "divs must balance after repair");
assert.equal(repairedShape.divClose, 1, "the orphan closing div is removed");
const repairedIframe = repaired.match(/<iframe[^>]*>/i)?.[0] || "";
assert.equal((repairedIframe.match(/\bloading=/gi) || []).length, 1, "duplicate loading collapsed");
assert.equal((repairedIframe.match(/\breferrerpolicy=/gi) || []).length, 1, "duplicate referrerpolicy collapsed");

// 5. Repair is stable: sanitizing the repaired body changes nothing further.
assert.equal(sanitizeEditorialHtml(repaired), repaired, "repair must be idempotent");

// 6. Non-allowlisted closing tags never leak through.
assert.equal(sanitizeEditorialHtml("<p>a</p></div></section><p>b</p>"), "<p>a</p><p>b</p>");

// 7. Allowed closing tags are preserved.
assert.equal(sanitizeEditorialHtml("<p><strong>bold</strong></p>"), "<p><strong>bold</strong></p>");

console.log("editorial sanitizer idempotency contract: OK");
