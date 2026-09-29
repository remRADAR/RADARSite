

## Archive taxonomy and routing correction — 2026-09-29

The isolated CMS branch now enforces the canonical editorial model: RADARArticles → Press/Spotlight; Motherland as an independent project association; Magazine → Special Episode/Magazine Episode. Legacy article/interview, Discovery Spot, and TALK TO US metadata are normalized deterministically without rewriting the committed snapshot or duplicating article records. Motherland-associated Spotlights remain in both surfaces.

The public RADARArticles landing is navigation-first. Dedicated Press and Spotlight archives use 10-item pagination, current RADARCharts imports before legacy records, publication date descending, deterministic slug tie-breaking, and draft/archived exclusion. Magazine is kept separate and canonical Magazine article links preserve `/ontheradar/articles/[slug]` identity. Legacy discovery and talk-to-us aliases resolve to canonical Spotlight/Magazine surfaces.

Snapshot reconciliation: 342 total; 214 Press; 91 Spotlight; 37 Magazine; 21 Special Episode; 16 Magazine Episode; 21 Motherland-associated; 8 Spotlight + Motherland overlap; 0 manual review; 0 invalid/missing canonical taxonomy; 0 duplicate slugs. Full evidence: `reports/RADAR_ARCHIVE_TAXONOMY_AND_ROUTING_2026-09-29.md`. Local contracts, TypeScript, lint, build, diff check, and built-server route smoke tests passed. No Production data, WordPress, R2, DNS, Vercel Production, or `main` was modified; do not merge or deploy without the next explicit gate.
