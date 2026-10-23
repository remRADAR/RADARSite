import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NOTION_MEDIA_STAGING_PAGES } from "../src/lib/notion-media-scope";

const expected = [
  "40158434-c727-8181-bf35-db6eb5a4dd40",
  "3ff58434-c727-812e-824e-f3dc1a5861fa",
  "3ff58434-c727-81c6-acc7-e3a3e98cf593",
  "3fb58434-c727-8193-ab8e-dfa1d75a6ab2",
  "3fa58434-c727-8059-8f09-fb587d46b65d",
  "3f758434-c727-81f9-8cd9-f20d3921b369",
];

async function main() {
  assert.deepEqual([...NOTION_MEDIA_STAGING_PAGES], expected);
  assert.equal(new Set(NOTION_MEDIA_STAGING_PAGES).size, NOTION_MEDIA_STAGING_PAGES.length, "staging page IDs must be unique");
  assert.ok(NOTION_MEDIA_STAGING_PAGES.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)), "each staging page ID must be a UUID");

  const [route, script] = await Promise.all([
    readFile("src/app/api/integrations/notion/stage-media/route.ts", "utf8"),
    readFile("scripts/stage-notion-media.ts", "utf8"),
  ]);
  assert.match(route, /pages:\s*\[\.\.\.NOTION_MEDIA_STAGING_PAGES\]/, "the protected endpoint must use the shared fixed scope");
  assert.match(script, /const DEFAULT_PAGES = NOTION_MEDIA_STAGING_PAGES;/, "the CLI must use the same fixed scope by default");
  assert.match(script, /function mergeManifest\(/, "applied staging must preserve existing manifest mappings");

  console.log(JSON.stringify({ pageCount: NOTION_MEDIA_STAGING_PAGES.length, sharedScope: true, manifestMerge: true }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
