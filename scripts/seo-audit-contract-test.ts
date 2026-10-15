/**
 * SEO Auditor contract test — pure, no database, no network.
 * Run: npm run test:seo-audit
 */
import assert from "node:assert/strict";
import type { CmsRecord, ContentCollections } from "../src/lib/content-server";
import { auditPath, createAuditContext, STATIC_ROUTES, validateJsonLdBlocks } from "../src/lib/seo-audit/audit-engine";
import { normalizeAuditPath, isValidExternalUrl } from "../src/lib/seo-audit/url-validation";
import { CATEGORY_WEIGHTS, computeScores, scoreCategory } from "../src/lib/seo-audit/score";
import type { AuditFinding } from "../src/lib/seo-audit/types";

function fixtureCollection(overrides: Partial<Record<"articles" | "artists" | "releases", CmsRecord[]>> = {}): ContentCollections {
  const artists: CmsRecord[] = overrides.artists ?? [{ slug: "rema", name: "Rema", status: "published" }];
  const releases: CmsRecord[] = overrides.releases ?? [{ slug: "ravage", name: "Ravage", status: "published" }];
  return {
    artists: artists as never,
    releases: releases as never,
    articles: (overrides.articles ?? []) as never,
    magazine: [] as never,
    radarProjects: [] as never,
    events: [] as never,
    pages: [],
    categories: [],
    archives: [],
  };
}

const goodBody = `<h1>Rema headlines the RADAR Sessions finale in Lagos</h1><p>${"The RADAR Sessions closed its season with a full-length performance that traced the artist's catalogue from early releases to recent work. ".repeat(8)}</p><p>Read more about <a href="/radarmusic/artists/rema">Rema on RADAR</a> or browse <a href="/ontheradar/articles">all articles</a>.</p><img src="https://radarcharts.net/social/card.webp" alt="Rema performing at the RADAR Sessions finale" width="1200" height="630" />`;

function goodArticle(): CmsRecord {
  return {
    slug: "rema-radar-sessions-finale",
    title: "Rema headlines the RADAR Sessions finale in Lagos",
    metaDescription: "Rema closed the RADAR Sessions season with a full-length performance in Lagos, tracing his catalogue from early releases to recent work.",
    excerpt: "Rema closed the RADAR Sessions season with a full-length Lagos performance.",
    author: "REM",
    publishedAt: "2026-09-01T10:00:00.000Z",
    modifiedAt: "2026-09-02T10:00:00.000Z",
    status: "published",
    tags: ["Sessions", "Live"],
    categories: ["Spotlight"],
    featuredImage: "/social/radar-card.webp",
    bodyHtml: goodBody,
  };
}

let failures = 0;
async function test(name: string, run: () => Promise<void> | void) {
  try {
    await run();
    console.log(`ok - ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL - ${name}`, error);
  }
}

function findingsOf(report: { findings: AuditFinding[] }, id: string) {
  return report.findings.filter((finding) => finding.id === id);
}

await test("URL validation accepts site paths and absolute site URLs", () => {
  assert.deepEqual(normalizeAuditPath("/ontheradar/articles/x"), { ok: true, path: "/ontheradar/articles/x" });
  assert.deepEqual(normalizeAuditPath("https://radarcharts.net/ontheradar/articles/x"), { ok: true, path: "/ontheradar/articles/x" });
  assert.deepEqual(normalizeAuditPath("https://www.radarcharts.net/ontheradar/articles/x/"), { ok: true, path: "/ontheradar/articles/x" });
  assert.deepEqual(normalizeAuditPath("https://radarcharts.net/ontheradar/articles/x?utm=1#frag"), { ok: true, path: "/ontheradar/articles/x" });
});

await test("URL validation rejects SSRF vectors and non-site targets", () => {
  for (const input of [
    "https://evil.com/path",
    "http://localhost/admin",
    "http://127.0.0.1/",
    "http://10.0.0.5/",
    "http://192.168.1.10/",
    "http://172.16.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/",
    "ftp://radarcharts.net/x",
    "https://user:pass@radarcharts.net/",
    "https://radarcharts.net:8443/",
    "/admin",
    "/api/health",
    "not-a-url",
    "",
  ]) {
    const result = normalizeAuditPath(input);
    assert.equal(result.ok, false, `expected rejection for ${input}`);
  }
});

await test("External URL syntax validation", () => {
  assert.equal(isValidExternalUrl("https://example.com/post"), true);
  assert.equal(isValidExternalUrl("example.com/post"), false);
  assert.equal(isValidExternalUrl("https://radarcharts.net/x"), false);
  assert.equal(isValidExternalUrl("http://169.254.169.254/"), false);
  assert.equal(isValidExternalUrl("javascript:alert(1)"), false);
});

await test("A complete article audits clean with a high score", async () => {
  const content = fixtureCollection({ articles: [goodArticle()] });
  const context = createAuditContext(content);
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale");
  assert.equal(report.status, "completed");
  assert.equal(report.contentType, "article");
  assert.equal(report.counts.critical, 0, JSON.stringify(report.findings, null, 2));
  assert.ok(report.scores.overall >= 85, `overall ${report.scores.overall}`);
});

await test("A broken article surfaces critical findings across categories", async () => {
  const broken: CmsRecord = {
    slug: "broken-story",
    title: "Rema headlines the RADAR Sessions finale in Lagos", // duplicate title
    canonicalUrl: "https://radarcharts.net/some/other/path",
    status: "published",
    bodyHtml: `<h1>First</h1><h1>Second</h1><p>Short body with <a href="/ontheradar/articles/does-not-exist">a broken link</a>.</p><img src="http://radarcharts.net/insecure.webp">`,
  };
  const content = fixtureCollection({ articles: [goodArticle(), broken] });
  const context = createAuditContext(content);
  const report = await auditPath(context, "/ontheradar/articles/broken-story");
  const ids = new Set(report.findings.map((finding) => finding.id));
  for (const expected of ["mixed-content", "broken-internal-link", "canonical-field-mismatch", "image-alt-missing", "h1-multiple", "meta-title-duplicate", "content-thin", "author-missing", "publish-date-missing", "jsonld-author-missing"]) {
    assert.ok(ids.has(expected), `missing finding ${expected} in ${[...ids].join(", ")}`);
  }
  assert.ok(report.counts.critical >= 3);
  assert.ok(report.scores.overall < 60, `overall ${report.scores.overall}`);
});

await test("Unknown routes fail with a critical finding", async () => {
  const context = createAuditContext(fixtureCollection());
  const report = await auditPath(context, "/ontheradar/articles/never-published");
  assert.equal(report.status, "failed");
  assert.equal(report.counts.critical, 1);
  assert.equal(report.findings[0].id, "unknown-route");
});

await test("Static routes audit as route content with clean technical score", async () => {
  const context = createAuditContext(fixtureCollection());
  const report = await auditPath(context, "/");
  assert.equal(report.status, "completed");
  assert.equal(report.contentType, "route");
  assert.equal(report.scores.technical, 100);
  assert.ok(STATIC_ROUTES.has("/"));
});

await test("Live fetch results drive HTTP, canonical and noindex checks", async () => {
  const context = createAuditContext(fixtureCollection({ articles: [goodArticle()] }));
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale", {
    liveFetch: async () => ({
      finalUrl: "https://radarcharts.net/ontheradar/articles/rema-radar-sessions-finale",
      status: 404,
      html: "<html><head><meta name='robots' content='noindex, follow'></head><body>oops</body></html>",
    }),
  });
  const ids = new Set(report.findings.map((finding) => finding.id));
  assert.ok(ids.has("http-status"));
  assert.ok(ids.has("canonical-tag-missing"));
  assert.ok(ids.has("unexpected-noindex"));
  assert.equal(report.liveFetch, true);
});

await test("Redirected URLs are flagged", async () => {
  const context = createAuditContext(fixtureCollection({ articles: [goodArticle()] }));
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale", {
    liveFetch: async () => ({ finalUrl: "https://radarcharts.net/ontheradar/articles/elsewhere", status: 200, html: "<html></html>" }),
  });
  assert.ok(report.findings.some((finding) => finding.id === "redirect-detected"));
});

await test("JSON-LD validation catches syntax, schema and date errors", () => {
  const { findings } = validateJsonLdBlocks([
    "{ not json",
    JSON.stringify({ "@context": "https://schema.org", "@type": "Article", datePublished: "2026-01-02T00:00:00Z", dateModified: "2026-01-01T00:00:00Z" }),
    JSON.stringify({ "@type": "Hologram" }),
  ]);
  const ids = new Set(findings.map((finding) => finding.id));
  assert.ok(ids.has("jsonld-parse-error"));
  assert.ok(ids.has("jsonld-article-missing-headline"));
  assert.ok(ids.has("jsonld-contradictory-dates"));
  assert.ok(ids.has("jsonld-unsupported-type"));
});

await test("Scoring is capped and weights sum to one", () => {
  assert.equal(CATEGORY_WEIGHTS.reduce((total, entry) => total + entry.weight, 0), 1);
  const criticals: AuditFinding[] = Array.from({ length: 6 }, (_, index) => ({ id: `c${index}`, category: "technical", severity: "critical", title: "", description: "", evidence: "", recommendation: "", status: "open", autoFixable: false }));
  assert.equal(scoreCategory(criticals, "technical"), 0);
  const scores = computeScores(criticals);
  assert.ok(Number.isFinite(scores.overall));
  assert.ok(scores.overall >= 0 && scores.overall <= 100);
  const mixed: AuditFinding[] = [
    { ...criticals[0], severity: "critical", category: "metadata" },
    { ...criticals[0], severity: "warning", category: "metadata" },
  ];
  assert.equal(scoreCategory(mixed, "metadata"), 65);
});

await test("Verified music entity fields produce facts, not guesses", async () => {
  const article: CmsRecord = { ...goodArticle(), sourceArtistName: "Rema" };
  const content = fixtureCollection({ articles: [article] });
  const context = createAuditContext(content);
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale");
  const verified = report.findings.find((finding) => finding.id === "music-entity-verified-fields");
  assert.ok(verified, "expected verified-fields finding");
  assert.equal(verified.severity, "info");
  assert.ok(verified.evidence.includes("Rema"));
});

await test("Unverified artist mentions are flagged as candidates needing verification", async () => {
  // Body mentions "Rema" but no documented entity fields exist.
  const content = fixtureCollection({ articles: [goodArticle()] });
  const context = createAuditContext(content);
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale");
  const candidates = report.findings.filter((finding) => finding.id === "music-entity-candidate-unverified");
  assert.ok(candidates.length >= 1);
  for (const candidate of candidates) {
    assert.ok(candidate.description.includes("candidate"), candidate.description);
    assert.ok(candidate.description.toLowerCase().includes("not a verified"), candidate.description);
  }
});

await test("Press-like records without sources are flagged", async () => {
  const article: CmsRecord = { ...goodArticle(), editorialType: "Press", sourceUrl: "" };
  const context = createAuditContext(fixtureCollection({ articles: [article] }));
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale");
  assert.ok(report.findings.some((finding) => finding.id === "source-missing"));
  const malformed: CmsRecord = { ...goodArticle(), editorialType: "Press", sourceUrl: "notaurl" };
  const context2 = createAuditContext(fixtureCollection({ articles: [malformed] }));
  const report2 = await auditPath(context2, "/ontheradar/articles/rema-radar-sessions-finale");
  assert.ok(report2.findings.some((finding) => finding.id === "source-url-invalid"));
});

await test("Duplicate body content across records is detected", async () => {
  const clone: CmsRecord = { ...goodArticle(), slug: "duplicate-story" };
  const context = createAuditContext(fixtureCollection({ articles: [goodArticle(), clone] }));
  const report = await auditPath(context, "/ontheradar/articles/duplicate-story");
  const duplicates = report.findings.filter((finding) => finding.id === "duplicate-content-risk");
  assert.equal(duplicates.length, 1);
  assert.ok(duplicates[0].evidence.includes("/ontheradar/articles/rema-radar-sessions-finale"));
});

await test("Audit reports carry the expected scorecard shape", async () => {
  const context = createAuditContext(fixtureCollection({ articles: [goodArticle()] }));
  const report = await auditPath(context, "/ontheradar/articles/rema-radar-sessions-finale");
  for (const key of ["url", "path", "contentType", "auditedAt", "auditVersion", "status", "liveFetch", "scores", "findings", "counts", "notes"]) {
    assert.ok(key in report, `missing ${key}`);
  }
  for (const key of ["overall", "technical", "metadata", "structuredData", "internalLinks", "editorial"]) {
    assert.ok(typeof report.scores[key as keyof typeof report.scores] === "number", `missing score ${key}`);
  }
  assert.equal(report.url, "https://radarcharts.net/ontheradar/articles/rema-radar-sessions-finale");
});

if (failures > 0) {
  console.error(`\n${failures} SEO audit contract test(s) failed.`);
  process.exit(1);
}
console.log("\nAll SEO audit contract tests passed.");
