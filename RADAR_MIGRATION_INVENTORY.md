# RADARCharts migration inventory

The imported project is a Next.js App Router site using Tailwind CSS v4, GSAP/ScrollTrigger, Lenis, React Three Fiber/Three.js, Playwright, a custom cursor, a fixed header/footer shell, a pinned selected-work grid, case-study routes, and a client portal/brief workflow.

| Concern | Verified implementation |
|---|---|
| App Router | `src/app/(marketing)`, `src/app/(platform)`, `src/app/admin` |
| Global design system | `src/app/globals.css` |
| Marketing shell | `src/app/(marketing)/layout.tsx`, `SiteHeader`, `SiteFooter` |
| Hero | `src/components/marketing/Hero.tsx` |
| Capability rows | `src/components/marketing/PillarsSection.tsx` |
| Selected work | `src/components/marketing/SelectedWork.tsx`, `WorkGrid.tsx`, `WorkEntry.tsx` |
| Case-study architecture | `src/components/case-study/*`, `src/app/(marketing)/work/[slug]/page.tsx` |
| Motion | `src/components/motion/*`, `src/lib/motion.ts` |
| WebGL | `src/components/three/*` |
| Portal/brief workflow | `src/components/platform/*`, `src/data/projects.ts`, `src/data/briefs.ts` |
| Tests | `tests/e2e/*` |

## Migration decisions

The existing composition and interaction model were preserved. RADARCharts content is now seeded in `src/lib/radar-content.ts` and `src/lib/case-studies.ts`; the hero consumes a typed `HeroConfig` and crossfades active image slides with reduced-motion behavior and a failed-media fallback. The black/white inversion is centralized in CSS variables and compatibility utility mappings rather than distributed component rewrites.

The `/admin` route is intentionally a low-disruption starter layer backed by browser local storage. This makes content overrides previewable immediately without introducing an unconfigured database or CMS dependency. For production multi-user editing, the same content shapes can be moved to a headless CMS or a database connector without replacing the public components; that is the remaining infrastructure decision.
