import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [scope, route, panel] = await Promise.all([
  readFile(new URL("../src/lib/notion-media-scope.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/studio/notion-images/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/admin/NotionImageUploadPanel.tsx", import.meta.url), "utf8"),
]);
const pageIds = [...scope.matchAll(/^\s+"([a-f0-9-]{36})",/gm)].map((match) => match[1]);
assert.equal(pageIds.length, 6, "the uploader must use the six configured pages");
assert.equal(new Set(pageIds).size, pageIds.length, "page allowlist must be unique");

assert.match(route, /export async function GET\(request: NextRequest\)/);
assert.match(route, /export async function POST\(request: NextRequest\)/);
assert.equal((route.match(/if \(!requireSession\(request\)\)/g) || []).length, 2, "both API methods require the Studio session");
assert.match(route, /if \(!isSameOriginMutation\(request\)\)/, "upload mutations must reject cross-origin requests");
assert.match(route, /const MAX_FILE_BYTES = 4 \* 1024 \* 1024/);
assert.match(route, /const MAX_REQUEST_BYTES = MAX_FILE_BYTES \+ 64 \* 1024/);
assert.match(route, /if \(size > MAX_REQUEST_BYTES\)/, "multipart body is bounded even without Content-Length");
assert.match(route, /const PAGE_IDS = new Set<string>\(NOTION_MEDIA_STAGING_PAGES\)/);
assert.match(route, /!PAGE_IDS\.has\(pageId\)/, "writes must be restricted to the configured pages");
assert.match(route, /convertNotionImageToWebp/);
assert.match(route, /putMediaObject/);
assert.match(route, /validateMediaDeliveryUrl/);
assert.match(route, /confirmReplacement/);
assert.match(route, /EDITORIAL_PROPERTY_NAMES\.featuredImageUpload\]: \{ files:/, "only the featured-image files property is updated");
assert.doesNotMatch(route, /EDITORIAL_PROPERTY_NAMES\.status|EDITORIAL_PROPERTY_NAMES\.publish|EDITORIAL_PROPERTY_NAMES\.featured\s*\]:/, "image upload must not publish or change article status/featured state");

assert.match(panel, /window\.confirm\(/, "replacements require explicit confirmation");
assert.match(panel, /method: "POST", body: form/);
assert.match(panel, /image\/jpeg,image\/png,image\/webp,image\/gif,image\/avif/);
assert.match(panel, /max 4 MiB/i);
assert.match(panel, /does not confirm the image currently renders on the site/i);
console.log("Notion image upload contract passed (six-page scope, auth, body bounds, R2 validation, confirmed field replacement, no publish-state changes).");
