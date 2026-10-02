import assert from "node:assert/strict";
import { AMBIENT_TRACK_SRC, DEFAULT_AMBIENT_VOLUME, MAX_AMBIENT_VOLUME, clampAmbientVolume } from "../src/lib/radar-ambient-engine";

assert.equal(AMBIENT_TRACK_SRC, "/audio/backgroundsound.mp3");
assert.equal(clampAmbientVolume(0.9), MAX_AMBIENT_VOLUME);
assert.equal(clampAmbientVolume(MAX_AMBIENT_VOLUME), MAX_AMBIENT_VOLUME);
assert.equal(clampAmbientVolume(-1), 0);
assert.equal(clampAmbientVolume(Number.NaN), DEFAULT_AMBIENT_VOLUME);
console.log("RADAR ambient contract: PASS");
