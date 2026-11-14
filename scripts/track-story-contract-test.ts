import assert from "node:assert/strict";
import { normalizeStorySyncCards, normalizeTrackStory } from "@/lib/track-story";

const cards = normalizeStorySyncCards([
  { id: "late", atSeconds: 20, title: "Late", body: "Later" },
  { id: "early", atSeconds: 0, title: "Early", body: "Opening" },
]);
assert.deepEqual(cards.map((card) => card.id), ["early", "late"]);
assert.equal(cards[0].atSeconds, 0);

const track = normalizeTrackStory({
  id: "track-demo",
  slug: "demo-track",
  title: "Demo Track",
  artistName: "Demo Artist",
  spotifyTrackId: "abc-123",
  storySyncCards: cards,
});
assert.equal(track.spotifyTrackId, "abc123");
assert.equal(track.slug, "demo-track");
assert.equal(track.storySyncCards[1].id, "late");

console.log(JSON.stringify({ ok: true, cards: track.storySyncCards.length, spotifyTrackId: track.spotifyTrackId }));
