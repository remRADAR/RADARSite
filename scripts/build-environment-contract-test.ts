import assert from "node:assert/strict";
import { isDatabaseDisabledDuringBuild } from "../src/lib/build-environment";

const originalSkip = process.env.RADAR_SKIP_DATABASE;
const originalPhase = process.env.NEXT_PHASE;

try {
  delete process.env.RADAR_SKIP_DATABASE;
  delete process.env.NEXT_PHASE;
  assert.equal(isDatabaseDisabledDuringBuild(), false, "normal runtime keeps database access enabled");

  process.env.RADAR_SKIP_DATABASE = "1";
  assert.equal(isDatabaseDisabledDuringBuild(), true, "the production build script flag disables database reads");

  delete process.env.RADAR_SKIP_DATABASE;
  process.env.NEXT_PHASE = "phase-production-build";
  assert.equal(isDatabaseDisabledDuringBuild(), true, "direct Next.js production builds also disable database reads");
} finally {
  if (originalSkip === undefined) delete process.env.RADAR_SKIP_DATABASE;
  else process.env.RADAR_SKIP_DATABASE = originalSkip;
  if (originalPhase === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = originalPhase;
}

console.log("Build environment contract passed (3 assertions). Runtime database access remains enabled.");
