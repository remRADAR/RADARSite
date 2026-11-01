import assert from "node:assert/strict";
import { defaultSiteConfig, normalizeSiteConfig } from "@/types/site-config";
import { defaultSiteOverrides, normalizeSiteOverrides } from "@/lib/site-overrides";

const oldAddress = "hello@radarcharts.com";
const newAddress = "hello@radarcharts.net";
const customAddress = "editor@example.org";

assert.equal(defaultSiteConfig.homepage.ctaSection.contactEmail, newAddress);
assert.equal(
  normalizeSiteConfig({
    homepage: {
      ...defaultSiteConfig.homepage,
      ctaSection: { ...defaultSiteConfig.homepage.ctaSection, contactEmail: oldAddress },
    },
  }).homepage.ctaSection.contactEmail,
  newAddress,
);
assert.equal(
  normalizeSiteConfig({
    homepage: {
      ...defaultSiteConfig.homepage,
      ctaSection: { ...defaultSiteConfig.homepage.ctaSection, contactEmail: customAddress },
    },
  }).homepage.ctaSection.contactEmail,
  customAddress,
);

assert.equal(defaultSiteOverrides.contactCTA.email, newAddress);
assert.equal(normalizeSiteOverrides({ contactCTA: { email: oldAddress } }).contactCTA.email, newAddress);
assert.equal(normalizeSiteOverrides({ contactCTA: { email: customAddress } }).contactCTA.email, customAddress);

const expectedTickerText = ["Music is life itself…", "#stayAKT!V", "Protect The Music, Fans & Brands, Always."];
assert.deepEqual(defaultSiteConfig.tickers.ticker2_heroMarquee.items.map((item) => item.text), expectedTickerText);
const previousTickerText = ["NEW OFFICIAL SITE", "AKT!V", "ON THE RADAR"];
const legacyTicker = normalizeSiteConfig({
  tickers: {
    ...defaultSiteConfig.tickers,
    ticker2_heroMarquee: {
      ...defaultSiteConfig.tickers.ticker2_heroMarquee,
      items: defaultSiteConfig.tickers.ticker2_heroMarquee.items.map((item, index) => ({ ...item, text: previousTickerText[index] || item.text })),
    },
  },
});
assert.deepEqual(legacyTicker.tickers.ticker2_heroMarquee.items.map((item) => item.text), expectedTickerText, "saved legacy defaults migrate to the new ticker copy");
const customTicker = normalizeSiteConfig({
  tickers: {
    ...defaultSiteConfig.tickers,
    ticker2_heroMarquee: { ...defaultSiteConfig.tickers.ticker2_heroMarquee, items: [{ id: "custom", text: "Custom campaign", icon: "*", linkUrl: "/custom" }] },
  },
});
assert.deepEqual(customTicker.tickers.ticker2_heroMarquee.items.map((item) => item.text), ["Custom campaign"], "custom ticker copy is preserved");

console.log("Homepage config contract passed: new ticker default, legacy migration, and custom values preserved.");
