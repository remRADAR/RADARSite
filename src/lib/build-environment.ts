/**
 * Production builds must render from committed defaults/snapshots and never
 * connect to the runtime database. The explicit package build flag is the
 * primary contract; NEXT_PHASE also protects direct `next build` invocations.
 */
export function isDatabaseDisabledDuringBuild() {
  return process.env.RADAR_SKIP_DATABASE === "1" || process.env.NEXT_PHASE === "phase-production-build";
}
