import assert from "node:assert/strict";
import { getSessionCookieOptions, getSessionMaxAge } from "../src/lib/studio-server";

const production = getSessionCookieOptions("radarcharts.net");
assert.deepEqual(production, {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
assert.equal(production.maxAge, getSessionMaxAge(), "admin sessions should retain their seven-day lifetime, not expire daily");

const preview = getSessionCookieOptions("3000-preview.us4.manus.computer");
assert.equal(preview.sameSite, "none", "embedded HTTPS previews need cross-site cookie compatibility");
assert.equal(preview.secure, true);
assert.equal(preview.httpOnly, true);

const local = getSessionCookieOptions("localhost");
assert.equal(local.sameSite, "lax");
assert.equal(local.secure, false, "plain-HTTP local development must remain usable");

const logout = getSessionCookieOptions("radarcharts.net", 0);
assert.equal(logout.maxAge, 0, "logout should expire only the admin session cookie");
assert.equal(logout.secure, true);
assert.equal(logout.path, "/");

console.log(JSON.stringify({
  productionCookieSecureAndHttpOnly: true,
  previewCookieCrossSiteSecure: true,
  localHttpDevelopmentSupported: true,
  sessionLifetimeSeconds: production.maxAge,
  logoutOnlyExpiresSessionCookie: true,
}, null, 2));
