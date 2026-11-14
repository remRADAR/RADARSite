import assert from "node:assert/strict";
import { getTrackStories, normalizeStorySyncCards, normalizeTrackStory, TrackStoryValidationError } from "@/lib/track-story";

const emptyContent = { artists: [], releases: [], articles: [], magazine: [], radarProjects: [], events: [], pages: [], categories: [], archives: [], tracks: [] };
const empty = getTrackStories(emptyContent);
assert.equal(empty.length, 0);
const cards = normalizeStorySyncCards([{ id: "late", atSeconds: 20, title: "Late", body: "Later" }, { id: "early", atSeconds: 0, title: "Early", body: "Opening" }]);
assert.deepEqual(cards.map((card) => card.id), ["early", "late"]);
const valid = normalizeTrackStory({ id: "track-demo", slug: "demo-track", title: "Demo Track", artistName: "Demo Artist", spotifyTrackId: "23PBTJplLcKv16Wv8xJ68a", storySyncCards: cards, status: "published" });
assert.equal(valid.spotifyTrackId, "23PBTJplLcKv16Wv8xJ68a");
assert.equal(getTrackStories({ ...emptyContent, tracks: [valid, { ...valid, slug: "draft-track", status: "draft" }, { ...valid, slug: "archived-track", status: "archived" }] }).length, 1);
assert.throws(() => normalizeTrackStory({ slug: "bad slug", title: "", artistName: "", spotifyTrackId: "abc", storySyncCards: [{ id: "same", atSeconds: -1, title: "", body: "" }, { id: "same", atSeconds: 1, title: "x", body: "y" }] }), TrackStoryValidationError);
console.log(JSON.stringify({ ok: true, emptyCollection: true, published: 1, invalidRejected: true }));
