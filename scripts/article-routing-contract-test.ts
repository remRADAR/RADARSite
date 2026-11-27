import assert from "node:assert/strict";
import {
  articleRoutingKey, curationVerdict, resolveArticleItinerary, retryDelayMs,
  routeArticle, routePublishedArticles, resetRoutingLedgerForTests, verifyArticleRouting,
} from "@/lib/article-routing";
import type { CmsRecord } from "@/lib/content-server";

/**
 * Contract test for the article curation + routing agent.
 *
 * Runs entirely in memory (no DATABASE_URL), so the ledger falls back to its
 * in-process store and the fleet can verify behaviour without a live database.
 * Network is always stubbed: nothing here talks to radarcharts.net.
 */

const base = (overrides: Partial<CmsRecord> = {}): CmsRecord => ({
  slug: "zumzy-brown-first-light",
  title: "Zumzy Brown Finds the First Light",
  status: "published",
  editorialType: "Spotlight",
  categories: ["Discovery Spot"],
  canonicalUrl: "",
  ...overrides,
});

function stubFetch(responses: Record<string, { status: number; body?: string }>) {
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const key = Object.keys(responses).find((candidate) => url.includes(candidate));
    const matched = key ? responses[key] : { status: 200, body: "" };
    return new Response(matched.body ?? "", { status: matched.status });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

// ---------------------------------------------------------------------------
// 1. Itinerary is deterministic
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  const first = resolveArticleItinerary(base());
  const second = resolveArticleItinerary(base());
  assert.deepEqual(first.stops.map((stop) => stop.channel), second.stops.map((stop) => stop.channel), "itinerary must be stable across calls");
  assert.equal(first.articleKey, "article:zumzy-brown-first-light");
  assert.equal(first.canonicalPath, "/ontheradar/articles/zumzy-brown-first-light");
  assert.ok(first.categories.includes("Discovery Spot"), "categories drive index routing");

  const channels = first.stops.map((stop) => stop.channel);
  for (const required of ["site", "sitemap", "social-card"] as const) {
    assert.ok(channels.includes(required), `${required} must always be a stop`);
  }
  // Owned surfaces must precede every external network.
  const firstExternal = Math.min(...first.stops.filter((stop) => stop.automatic === false).map((stop) => stop.order));
  const lastOwned = Math.max(...first.stops.filter((stop) => stop.automatic).map((stop) => stop.order));
  assert.ok(lastOwned < firstExternal, "an article must be complete on our own site before it is announced elsewhere");
  assert.deepEqual(channels, first.stops.slice().sort((a, b) => a.order - b.order).map((stop) => stop.channel), "stops are returned in order");
}

// ---------------------------------------------------------------------------
// 2. Uncurated article: owned stops still run, external stops are held
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  const unplaced = base({ editorialType: undefined, categories: [] });
  const itinerary = resolveArticleItinerary(unplaced);
  const verdict = curationVerdict(itinerary);
  assert.equal(verdict.ok, false, "an article with no authoritative category must not be broadcast");
  assert.ok(verdict.blocking.some((reason) => /editorial category/.test(reason)));

  const { fetcher } = stubFetch({});
  const report = await routeArticle(unplaced, { fetcher });
  const external = report.outcomes.filter((outcome) => ["newsletter", "x", "instagram", "facebook", "linkedin", "whatsapp"].includes(outcome.channel));
  assert.ok(external.length > 0, "external networks are still modelled");
  assert.ok(external.every((outcome) => outcome.status === "skipped"), "nothing uncurated may be announced externally");
  assert.equal(report.outcomes.find((outcome) => outcome.channel === "site")?.status, "delivered");
}

// ---------------------------------------------------------------------------
// 3. Idempotency: a re-publish never re-announces
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  process.env.ROUTING_X_WEBHOOK_URL = "https://hooks.example.test/x";
  const { fetcher, calls } = stubFetch({ "hooks.example.test": { status: 202 } });

  const first = await routeArticle(base(), { fetcher });
  const xFirst = first.outcomes.find((outcome) => outcome.channel === "x");
  assert.equal(xFirst?.status, "delivered", "a configured adapter must deliver");
  const afterFirst = calls.filter((url) => url.includes("hooks.example.test")).length;
  assert.equal(afterFirst, 1);

  const second = await routeArticle(base(), { fetcher });
  const xSecond = second.outcomes.find((outcome) => outcome.channel === "x");
  assert.equal(xSecond?.status, "delivered");
  assert.match(xSecond?.detail || "", /not repeated/, "a terminal delivery must not be repeated");
  assert.equal(calls.filter((url) => url.includes("hooks.example.test")).length, afterFirst, "no second HTTP dispatch");

  // force=true is the explicit override for a deliberate re-announce.
  await routeArticle(base(), { fetcher, force: true });
  assert.ok(calls.filter((url) => url.includes("hooks.example.test")).length > afterFirst, "force re-dispatches");
  delete process.env.ROUTING_X_WEBHOOK_URL;
}

// ---------------------------------------------------------------------------
// 4. Failure -> bounded backoff -> exhausted, never silently "delivered"
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  process.env.ROUTING_NEWSLETTER_WEBHOOK_URL = "https://hooks.example.test/newsletter";
  const { fetcher } = stubFetch({ "hooks.example.test": { status: 500 } });

  const first = await routeArticle(base(), { fetcher });
  const newsletter = first.outcomes.find((outcome) => outcome.channel === "newsletter");
  assert.equal(newsletter?.status, "failed");
  assert.equal(first.complete, false);
  assert.ok(first.blocked.includes("newsletter"));

  // Backoff must hold the stop instead of hammering the adapter.
  const second = await routeArticle(base(), { fetcher });
  assert.match(second.outcomes.find((outcome) => outcome.channel === "newsletter")?.detail || "", /Backing off/);

  assert.ok(retryDelayMs(1) < retryDelayMs(3), "backoff grows with attempts");
  assert.equal(retryDelayMs(50), 60 * 60_000, "backoff is capped at one hour");
  delete process.env.ROUTING_NEWSLETTER_WEBHOOK_URL;
}

// ---------------------------------------------------------------------------
// 5. Missing credential is deferred with the exact variable name
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  for (const key of ["ROUTING_NEWSLETTER_WEBHOOK_URL", "ROUTING_X_WEBHOOK_URL", "ROUTING_INSTAGRAM_WEBHOOK_URL", "ROUTING_FACEBOOK_WEBHOOK_URL", "ROUTING_LINKEDIN_WEBHOOK_URL", "ROUTING_WHATSAPP_WEBHOOK_URL"]) delete process.env[key];
  const { fetcher } = stubFetch({});
  const report = await routeArticle(base(), { fetcher });
  const deferred = report.outcomes.filter((outcome) => outcome.status === "deferred");
  assert.ok(deferred.length >= 6, "every unconfigured network is reported, not silently dropped");
  assert.ok(deferred.every((outcome) => /ROUTING_[A-Z_]+_WEBHOOK_URL/.test(outcome.detail)), "each deferral names its variable");
  assert.equal(report.complete, false);
  // A stop that was never configured must never be counted as delivered.
  assert.equal(report.outcomes.filter((outcome) => outcome.status === "delivered").every((outcome) => ["site", "sitemap", "social-card", "archive-index"].includes(outcome.channel)), true);
}

// ---------------------------------------------------------------------------
// 6. Verification checks the live surface, not the ledger's opinion of itself
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  const itinerary = resolveArticleItinerary(base());
  const allGood = stubFetch({
    "/sitemap.xml": { status: 200, body: "<url><loc>https://radarcharts.net/ontheradar/articles/zumzy-brown-first-light</loc></url>" },
  });
  const good = await verifyArticleRouting(itinerary, { fetcher: allGood.fetcher });
  assert.equal(good.checks.find((check) => check.channel === "sitemap")?.ok, true, "sitemap presence is verified by content match");

  const missingFromSitemap = stubFetch({ "/sitemap.xml": { status: 200, body: "<url><loc>https://radarcharts.net/</loc></url>" } });
  const bad = await verifyArticleRouting(itinerary, { fetcher: missingFromSitemap.fetcher });
  assert.equal(bad.checks.find((check) => check.channel === "sitemap")?.ok, false);
  assert.ok(bad.missing.includes("sitemap"));
  assert.equal(bad.ok, false, "an article absent from the sitemap is not verified as routed");

  const broken = stubFetch({ "/ontheradar/articles/zumzy-brown-first-light": { status: 404 } });
  const gone = await verifyArticleRouting(itinerary, { fetcher: broken.fetcher });
  assert.equal(gone.checks.find((check) => check.channel === "site")?.ok, false);
}

// ---------------------------------------------------------------------------
// 7. Sweep covers every published article and skips drafts
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  const { fetcher } = stubFetch({});
  const content = {
    articles: [
      base({ slug: "a-one" }),
      base({ slug: "a-two", editorialType: "Press", categories: ["RADARArticles"] }),
      base({ slug: "a-draft", status: "draft" }),
    ],
    magazine: [],
    artists: [], releases: [], events: [], pages: [], categories: [], archives: [],
  } as never;
  const reports = await routePublishedArticles(content, { fetcher });
  assert.deepEqual(reports.map((report) => report.slug), ["a-one", "a-two"], "drafts are never routed");
}

// ---------------------------------------------------------------------------
// 8. Dry run dispatches nothing
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  process.env.ROUTING_X_WEBHOOK_URL = "https://hooks.example.test/x";
  const { fetcher, calls } = stubFetch({ "hooks.example.test": { status: 202 } });
  const report = await routeArticle(base(), { fetcher, dryRun: true });
  assert.equal(calls.filter((url) => url.includes("hooks.example.test")).length, 0, "dry run makes no outbound calls");
  assert.equal(report.outcomes.find((outcome) => outcome.channel === "x")?.status, "deferred");
  delete process.env.ROUTING_X_WEBHOOK_URL;
}

// ---------------------------------------------------------------------------
// 9. Routing key identity is slug-based, so a re-publish resumes the same trip
// ---------------------------------------------------------------------------
{
  assert.equal(articleRoutingKey({ slug: "same-slug" }), articleRoutingKey({ slug: "same-slug" }));
  assert.notEqual(articleRoutingKey({ slug: "one" }), articleRoutingKey({ slug: "two" }));
}

// ---------------------------------------------------------------------------
// 10. Approval bridge: one tap is enough, retraction still wins, defaults inert
// ---------------------------------------------------------------------------
{
  const { bridgeApproval, scheduledDeferral, singleActionPublishEnabled, deferScheduledPublishEnabled } = await import("@/lib/notion-approval-bridge");
  const dataSource = {
    id: "8a6db547-6147-4f8a-85d2-d4fd6b7b3b75",
    properties: { Status: { type: "status", status: {} }, "Publish to RADARSite": { type: "checkbox", checkbox: {} }, "Scheduled Publish Date": { type: "date", date: {} } },
  };
  const page = (status: string, checked: boolean, scheduled?: string) => ({
    id: "3c7c6e7f-8f2a-4d56-9d1a-8f348f12c601",
    parent: { data_source_id: "8a6db547-6147-4f8a-85d2-d4fd6b7b3b75" },
    properties: {
      Status: { type: "status", status: { name: status } },
      "Publish to RADARSite": { type: "checkbox", checkbox: checked },
      ...(scheduled ? { "Scheduled Publish Date": { type: "date", date: { start: scheduled } } } : {}),
    },
  }) as never;

  assert.equal(singleActionPublishEnabled(), false, "single-action mode is OFF by default");

  // Default (flag off): a Draft with Publish checked is NOT promoted, so the
  // existing runtime contract is unchanged.
  const inert = await bridgeApproval(page("Draft", true), dataSource as never, "token");
  assert.equal(inert.action, "none", "with the flag off nothing is promoted");

  // Retraction always wins, even with the flag on.
  process.env.RADAR_NOTION_SINGLE_ACTION_PUBLISH = "true";
  const retracted = await bridgeApproval(page("Changes Requested", true), dataSource as never, "token");
  assert.equal(retracted.action, "blocked");
  const archived = await bridgeApproval(page("Archived", true), dataSource as never, "token");
  assert.equal(archived.action, "blocked");

  // Unchecked publish box is never approved by accident.
  const unchecked = await bridgeApproval(page("Draft", false), dataSource as never, "token");
  assert.equal(unchecked.action, "none");

  // Already-approved pages need no write.
  const already = await bridgeApproval(page("Approved", true), dataSource as never, "token");
  assert.equal(already.action, "none", "no redundant Notion write when already approved");

  // A future scheduled date defers instead of surfacing an error.
  assert.equal(deferScheduledPublishEnabled(), false);
  const notDeferred = scheduledDeferral(page("Approved", true, "2999-01-01") as never);
  assert.equal(notDeferred.deferred, false, "deferral is opt-in");
  process.env.RADAR_NOTION_DEFER_SCHEDULED_PUBLISH = "true";
  const deferred = scheduledDeferral(page("Approved", true, "2999-01-01") as never);
  assert.equal(deferred.deferred, true);
  assert.match(deferred.scheduledFor || "", /^2999/);
  // A past date is due, not deferred.
  assert.equal(scheduledDeferral(page("Approved", true, "2020-01-01") as never).deferred, false);
  // A malformed date is reported as invalid, not silently ignored.
  assert.equal(scheduledDeferral(page("Approved", true, "not-a-date") as never).invalid, true);

  delete process.env.RADAR_NOTION_SINGLE_ACTION_PUBLISH;
  delete process.env.RADAR_NOTION_DEFER_SCHEDULED_PUBLISH;
}

// ---------------------------------------------------------------------------
// 11. Webhook signature construction: a wrong token cannot forge a match
// ---------------------------------------------------------------------------
{
  const { createHmac } = await import("node:crypto");
  const token = "verification-token";
  const body = JSON.stringify({ id: "evt_1", type: "page.properties_updated" });
  const good = createHmac("sha256", token).update(body, "utf8").digest("hex");
  assert.equal(good.length, 64, "sha256 hex digest is 64 chars");
  assert.notEqual(createHmac("sha256", "wrong").update(body).digest("hex"), good, "a wrong token cannot produce the same digest");
  // Any body mutation must invalidate the digest — this is why the route verifies
  // the RAW body instead of re-serialised JSON.
  assert.notEqual(createHmac("sha256", token).update(body.replace("evt_1", "evt_2")).digest("hex"), good, "a tampered body cannot reuse a signature");
}

// ---------------------------------------------------------------------------
// 12. Routing never reports a delivery for an unconfigured channel
// ---------------------------------------------------------------------------
{
  resetRoutingLedgerForTests();
  const { fetcher } = stubFetch({});
  const report = await routeArticle(base(), { fetcher });
  for (const outcome of report.outcomes) {
    if (outcome.status === "delivered") {
      assert.ok(["site", "sitemap", "social-card", "archive-index"].includes(outcome.channel), `${outcome.channel} cannot be delivered without an adapter credential`);
    }
  }
  assert.equal(report.complete, false, "an article with unconfigured networks is not fully routed");
}

console.log("article-routing contract tests: 12 groups passed");
