import assert from "node:assert/strict";
import { validateIntakeBrief, validateEmbed } from "@/lib/editorial-intake";

const pressBrief = {
  workingTitle: "New single release",
  contentType: "Press" as const,
  purposeAngle: "Cover the single release",
  sourceUrls: ["https://example.com/press-release"],
  verifiedQuotes: [{ quote: "This song means everything.", attribution: "Artist, via label press release" }],
  embeds: [{ provider: "spotify" as const, url: "https://open.spotify.com/track/abc", trackTitle: "Hustler" }],
};

// Valid Press intake
const ok = validateIntakeBrief(pressBrief);
assert.equal(ok.ok, true);
assert.equal(ok.errors.length, 0);

// Missing metadata: no working title, no angle, no sources
const missing = validateIntakeBrief({ contentType: "Press" });
assert.equal(missing.ok, false);
assert.ok(missing.errors.some((error) => error.field === "workingTitle"));
assert.ok(missing.errors.some((error) => error.field === "purposeAngle"));
assert.ok(missing.errors.some((error) => error.field === "sourceUrls"));

// Incorrect taxonomy: invalid content type and Magazine without subtype
assert.equal(validateIntakeBrief({ ...pressBrief, contentType: "Blog" }).ok, false);
const magazineMissingSubtype = validateIntakeBrief({ ...pressBrief, contentType: "Magazine" });
assert.equal(magazineMissingSubtype.ok, false);
assert.ok(magazineMissingSubtype.errors.some((error) => error.field === "magazineSubtype"));
const magazineOk = validateIntakeBrief({ ...pressBrief, contentType: "Magazine", magazineSubtype: "Magazine Episode" });
assert.equal(magazineOk.ok, true);
assert.equal(validateIntakeBrief({ ...pressBrief, contentType: "Magazine", magazineSubtype: "Interview" }).ok, false);
assert.equal(validateIntakeBrief({ ...pressBrief, contentType: "Spotlight", magazineSubtype: "Magazine Episode" }).ok, false);

// Invalid embeds: non-https, wrong host, youtube vs spotify mismatch
assert.equal(validateEmbed({ provider: "spotify", url: "https://music.example.com/track" }).ok, false);
assert.equal(validateEmbed({ provider: "youtube", url: "https://open.spotify.com/watch?v=1" }).ok, false);
assert.equal(validateEmbed({ provider: "spotify", url: "http://open.spotify.com/track/abc" }).ok, false);
assert.equal(validateEmbed({ provider: "youtube", url: "https://www.youtube.com/watch?v=1" }).ok, true);
const badEmbed = validateIntakeBrief({ ...pressBrief, embeds: [{ provider: "spotify", url: "https://evil.example.com/x" }] });
assert.equal(badEmbed.ok, false);
assert.ok(badEmbed.errors.some((error) => error.field === "embeds[0]"));

// Quotes without attribution are rejected
const unattributed = validateIntakeBrief({ ...pressBrief, verifiedQuotes: [{ quote: "Great song.", attribution: "" }] });
assert.equal(unattributed.ok, false);
assert.ok(unattributed.errors.some((error) => error.field === "verifiedQuotes[0].attribution"));

// Optional fields stay optional; author warning only
const minimal = validateIntakeBrief(pressBrief);
assert.ok(minimal.warnings.some((warning) => warning.field === "author"));
assert.ok(minimal.warnings.some((warning) => warning.field === "musicEntity"));
assert.equal(minimal.ok, true);

// MOTHERLand accepted
assert.equal(validateIntakeBrief({ ...pressBrief, contentType: "MOTHERLand" }).ok, true);

console.log(JSON.stringify({ validation: "PASS", taxonomyGates: "PASS", embedValidation: "PASS", quoteAttribution: "PASS", optionalFieldWarnings: "PASS", databaseContacted: false }, null, 2));
