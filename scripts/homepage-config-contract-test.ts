import assert from "node:assert/strict";
import { COMMUNITY_CHANNEL_URL, defaultSiteConfig, normalizeSiteConfig } from "@/types/site-config";
import { defaultSiteOverrides, normalizeSiteOverrides } from "@/lib/site-overrides";

const oldAddress = "hello@radarcharts.com";
const newAddress = "hello@radarcharts.net";
const customAddress = "editor@example.org";
const brandTickerCopy = "MUSiC iS LiFE iTSELF. PROTECT THE MUSiC, FANS & BRAND ALWAYS #ONTHERADAR🗽";

assert.equal(defaultSiteConfig.homepage.ctaSection.contactEmail, newAddress);
assert.equal(defaultSiteConfig.tickers.ticker2_heroMarquee.items[0].text, brandTickerCopy);
assert.equal(defaultSiteConfig.tickers.ticker2_heroMarquee.items[0].linkUrl, COMMUNITY_CHANNEL_URL);
const legacyTicker = normalizeSiteConfig({
  tickers: {
    ticker2_heroMarquee: {
      enabled: true,
      speedSeconds: 26,
      items: ["NEW OFFICIAL SITE", "AKT!V", "ON THE RADAR"].map((text, index) => ({ id: `hero-ticker-${index + 1}`, text, linkUrl: "" })),
    },
  },
});
assert.equal(legacyTicker.tickers.ticker2_heroMarquee.items[0].text, brandTickerCopy);
assert.equal(legacyTicker.tickers.ticker2_heroMarquee.items[0].linkUrl, COMMUNITY_CHANNEL_URL);
const customTickerCopy = "CUSTOM CAMPAIGN COPY";
assert.equal(
  normalizeSiteConfig({
    tickers: {
      ticker2_heroMarquee: {
        enabled: true,
        speedSeconds: 20,
        items: [{ id: "custom", text: customTickerCopy, linkUrl: "https://example.org" }],
      },
    },
  }).tickers.ticker2_heroMarquee.items[0].text,
  customTickerCopy,
);
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

console.log("Homepage config contract passed: new default, legacy migration, custom values preserved.");
