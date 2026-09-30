const expected = "https://radarcharts.net";
const production = process.env.PRODUCTION_DEPLOYMENT === "1" || process.env.DEPLOYMENT_ENV === "production" || process.env.VERCEL_ENV === "production";

if (!production) {
  console.log("Production URL validation skipped: non-production environment.");
  process.exit(0);
}

if (process.env.NEXT_PUBLIC_SITE_URL !== expected) {
  console.error(`Production SEO validation failed: NEXT_PUBLIC_SITE_URL must be exactly ${expected}.`);
  process.exit(1);
}

console.log(`Production SEO validation passed: NEXT_PUBLIC_SITE_URL=${expected}`);
