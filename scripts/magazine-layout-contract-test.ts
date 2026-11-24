import assert from "node:assert/strict";
import { splitIntoPages } from "@/components/marketing/MagazineExperience";

const fixture = [
  "<p>Biography.</p>",
  "<figure><img src=\"https://example.com/intro.webp\"></figure>",
  "<p><strong>Where did you start?</strong></p>",
  "<blockquote><p>I started in Lagos.</p></blockquote>",
  "<p>The answer continues with more context.</p>",
  "<figure><img src=\"https://example.com/middle.webp\"></figure>",
  "<p><strong>What comes next?</strong></p>",
  "<blockquote><p>The next chapter is already moving.</p></blockquote>",
].join("\n");

const pages = splitIntoPages(fixture);
assert.equal(pages.length, 3, "biography plus two question pages should be preserved");
assert.match(pages[0], /Biography/);
assert.match(pages[1], /Where did you start\?/);
assert.match(pages[1], /The answer continues with more context/);
assert.match(pages[1], /middle\.webp/);
assert.ok(!pages[1].includes("What comes next?"), "a following question must not share the previous answer page");
assert.match(pages[2], /What comes next\?/);
assert.match(pages[2], /The next chapter is already moving/);
const pageSequence = pages.join("\n");
assert.ok(pageSequence.indexOf("middle.webp") < pageSequence.indexOf("What comes next?"), "content must remain in source order");

console.log(JSON.stringify({ questionStartsNewPage: "PASS", answerContinuation: "PASS", sourceOrder: "PASS" }, null, 2));
