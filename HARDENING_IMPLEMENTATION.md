# RADARCharts Hardening Implementation

## Summary

This pass adapts the supplied hardening work order to the repository’s actual architecture: a Next.js 16 App Router site with a custom Studio persistence layer rather than Payload, Sanity, or BCMS. The implementation preserves the current visual system and adds launch-oriented SEO, accessibility, image-delivery, and homepage-content foundations.

## Implemented changes

| Area | Implementation |
|---|---|
| SEO | Added `metadataBase`, title template, Nigerian English locale, canonical defaults, hreflang alternates, robots defaults, Open Graph, and Twitter card metadata. |
| Structured data | Added reusable `StructuredData` and site-wide Organization JSON-LD with logo and social profiles. |
| Accessibility | Added a skip link, stable `main` landmark target, labelled footer navigation, `aria-current` on the active hero control, and preserved descriptive navigation labels. |
| Hero presentation | Coordinates and supporting caption now use white text while the ON THE RADAR headline treatment remains unchanged. Slide controls are compact circular dots positioned at the lower-right corner. |
| Image and CSP configuration | Added the RADAR CDN to Next image remote patterns and the CSP image allowlist. |
| CMS schema | Extended the existing override model with geo signature, banner carousel, ecosystem navigation, case studies, process steps, testimonials, footer navigation, homepage video, YouTube feed, and contact CTA types. Normalization enforces collection limits, visibility flags, ordering, URL validation, and metadata length limits. |
| Data-driven rendering | Wired geographic signature, ecosystem navigation, contact CTA, and footer navigation to the live override model. |
| Accessibility testing | Added `scripts/check-accessibility.mjs` using Playwright and axe-core, covering `/`, `/about`, and `/work`. Run with `npm run test:a11y`. |

## Validation

The following checks passed during this implementation:

- `npx tsc --noEmit`
- `npm run build`
- `npm run lint` with no blocking errors
- Homepage HTML verification confirmed one `<h1>`, JSON-LD output, a canonical link, and the skip-link text.

The axe-core script is included as a repeatable deliverable. A local browser runtime was installed during validation; the audit should be rerun in the target deployment environment before launch sign-off.

## Acceptance limitations

The supplied acceptance criteria require Lighthouse Core Web Vitals thresholds and Google Rich Results Test validation. Those are environment-dependent and cannot be honestly claimed from a local production build alone. The existing Studio panel persists the expanded schema through the shared settings API, but a dedicated field-by-field form for all nine new groups remains a follow-up UI refinement; the schema is available now for controlled JSON editing and data-driven rendering.

## Files of note

- `src/app/layout.tsx`
- `src/components/StructuredData.tsx`
- `src/components/marketing/Hero.tsx`
- `src/lib/site-overrides.ts`
- `src/lib/studio-server.ts`
- `scripts/check-accessibility.mjs`
