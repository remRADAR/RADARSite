/**
 * Media reference contract test.
 *
 * Guards the defect class that shipped a broken welcome notice: a component
 * referencing a /media/... asset that does not exist in public/. The browser
 * gets a 404 and the visitor sees a dead control with no error.
 *
 * Every literal "/media/<file>" string in src/ must resolve to a real file in
 * public/media/. Run in CI so a missing asset fails the build instead of
 * reaching production.
 *
 * Usage: npm run media-reference:contract-test
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss"]);
const MEDIA_REFERENCE = /["'`(](\/media\/[A-Za-z0-9._\-/]+)["'`)]/g;

type Reference = { file: string; line: number; path: string };

function walk(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      found.push(...walk(full));
    } else if (SOURCE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      found.push(full);
    }
  }
  return found;
}

function collectReferences(): Reference[] {
  const references: Reference[] = [];
  for (const file of walk(SRC)) {
    const contents = readFileSync(file, "utf8");
    const lines = contents.split("\n");
    lines.forEach((text, index) => {
      for (const match of text.matchAll(MEDIA_REFERENCE)) {
        references.push({ file: relative(ROOT, file), line: index + 1, path: match[1] });
      }
    });
  }
  return references;
}

function existsInPublic(mediaPath: string): boolean {
  const target = join(PUBLIC, mediaPath.replace(/^\/+/, ""));
  try {
    return statSync(target).isFile();
  } catch {
    return false;
  }
}

function main() {
  const references = collectReferences();

  // A silent zero would mean the scanner broke, not that the codebase is clean.
  assert.ok(
    references.length > 0,
    "media-reference contract: found no /media/ references at all — the scanner is broken, not the codebase",
  );

  const missing = references.filter((reference) => !existsInPublic(reference.path));

  if (missing.length > 0) {
    const report = missing
      .map((reference) => `  ${reference.file}:${reference.line} -> ${reference.path}`)
      .join("\n");
    assert.fail(
      `media-reference contract: ${missing.length} reference(s) point at files that do not exist in public/:\n${report}\n` +
        "Ship the asset or repoint the reference at a file that exists.",
    );
  }

  // Every reference must be unique per file+line+path, and the set of distinct
  // assets must all be present — reported so a reviewer can see what is covered.
  const distinct = [...new Set(references.map((reference) => reference.path))].sort();
  console.log(`media-reference contract: ${references.length} reference(s) across ${distinct.length} asset(s) all resolve.`);
  for (const asset of distinct) console.log(`  ok  ${asset}`);
}

main();
