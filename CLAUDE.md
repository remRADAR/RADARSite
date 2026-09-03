# CLAUDE CONFIG – Agency Platform

## Project intent
You are assisting on a high-end, narrative-driven website for an enterprise creative agency & production house. The goal is to produce code and content that feels bespoke, cinematic, and human-crafted — not generic AI output.

## Design & UX expectations
- Prioritize visual hierarchy, typography, and whitespace.
- Motion must be meaningful, subtle, and consistent.
- Avoid generic "template" UI; avoid obvious Bootstrap-style patterns.
- Favor fewer, more intentional animations over many noisy ones.
- Respect accessibility and reduced-motion preferences.

## Tech stack
- Next.js (App Router, TypeScript, React)
- Tailwind CSS
- shadcn/ui components, customized to the brand system
- GSAP for motion and scroll-linked animation
- Optional Three.js / react-three-fiber for select hero/visuals
- Playwright for E2E and visual regression tests

## File and code style
- Use TypeScript and functional React components.
- Prefer server components by default in Next.js; mark client components with `"use client"`.
- Abstract repeated patterns into reusable components in `src/components`.
- Keep components focused and small; avoid "god components".
- Use Tailwind classes for layout; use CSS modules or global styles only for complex motion / 3D.

## Claude skills to use
When available, prefer these skills:
- **ui-ux-pro-max** or similar — for UX flows, information architecture, and layout guidance.
- **motion / gsap-expert** — for defining GSAP timelines, ScrollTrigger usage, and easing systems.
- **threejs-architect** — for designing and implementing Three.js / R3F scenes.
- **tailwind-mastery** — for clean, composable Tailwind-based implementations of designs.
- **shadcn-pro** — for composing shadcn/ui components with a custom theme.
- **web-design-guidelines / taste** — for critique and iteration, especially around "generic AI" smell.
- **playwright** — for authoring and updating E2E and visual tests.

If these skills are not installed, generate the exact CLI commands needed to install them (via the official skills marketplace or skills.sh) and propose them to the user in your first response involving that skill.

## Working style
- Read PLAN.md and ux/* before making structural decisions.
- For new features:
  1. Propose the UX briefly.
  2. Outline component structure.
  3. Then generate code in small, focused chunks.
- Always keep marketing and client/platform sections visually unified but clearly differentiated.
- Periodically review code for:
  - Consistent animation patterns.
  - Typography scale consistency.
  - No dead/unreachable code.

## Motion rules
- Define centralized animation tokens (durations, easings) and reuse them.
- Use GSAP timelines for complex sequences.
- Respect `prefers-reduced-motion`; offer fallbacks / static states.
- No gratuitous bouncing, overshooting, or spinning.

## Testing expectations
- Create Playwright tests for:
  - Key routes.
  - Core flows: navigating work, creating a brief, viewing a project.
- Add visual regression tests for:
  - Landing hero.
  - Work grid.
  - Case study detail hero.

## Output quality
- All code must be syntactically correct and ready to paste.
- Prefer clarity and maintainability over cleverness.
- Avoid placeholders like "Lorem ipsum" or "generic agency name"; use plausible, distinctive copy that fits a premium creative brand.
