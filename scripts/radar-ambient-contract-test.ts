import assert from "node:assert/strict";
import { AMBIENT_PERIODS, DEFAULT_AMBIENT_VOLUME, MAX_AMBIENT_VOLUME, clampAmbientVolume, getAmbientPeriod } from "../src/lib/radar-ambient-engine";

const at = (hour: number) => new Date(2026, 8, 29, hour, 0, 0, 0);
assert.equal(getAmbientPeriod(at(5)), "early-morning");
assert.equal(getAmbientPeriod(at(8)), "daytime");
assert.equal(getAmbientPeriod(at(17)), "evening");
assert.equal(getAmbientPeriod(at(21)), "night");
assert.equal(getAmbientPeriod(at(0)), "night");
assert.equal(getAmbientPeriod(at(1)), "late-night");
assert.equal(getAmbientPeriod(at(4)), "late-night");
assert.deepEqual(AMBIENT_PERIODS, ["early-morning", "daytime", "evening", "night", "late-night"]);
assert.equal(clampAmbientVolume(0.9), MAX_AMBIENT_VOLUME);
assert.equal(clampAmbientVolume(MAX_AMBIENT_VOLUME), MAX_AMBIENT_VOLUME);
assert.equal(clampAmbientVolume(-1), 0);
assert.equal(clampAmbientVolume(Number.NaN), DEFAULT_AMBIENT_VOLUME);
console.log("RADAR ambient contract: PASS");
