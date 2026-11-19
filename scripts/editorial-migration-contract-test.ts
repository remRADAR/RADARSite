import assert from "node:assert/strict";
import { sanitizeEditorialHtml } from "@/lib/editorial-migration";

const nestedComment = sanitizeEditorialHtml(
  "<p>before<!--<!-- nested -->after--><strong>kept</strong></p>",
);
assert.doesNotMatch(nestedComment, /<!--/, "nested comments are not reintroduced");
assert.match(nestedComment, /<strong>kept<\/strong>/, "safe editorial markup remains");

const unclosedComment = sanitizeEditorialHtml("<p>before</p><!-- unclosed <strong>hidden");
assert.doesNotMatch(unclosedComment, /<!--/, "unterminated comments are removed");
assert.equal(unclosedComment, "<p>before</p>", "content after an unterminated comment is discarded");

console.log(JSON.stringify({ nestedCommentsRemoved: "PASS", unterminatedCommentsRemoved: "PASS" }, null, 2));
