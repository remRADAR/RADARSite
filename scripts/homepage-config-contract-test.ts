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

console.log("Homepage config contract passed: new default, legacy migration, custom values preserved.");
