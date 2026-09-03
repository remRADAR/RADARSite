# Enterprise Creative Agency & Production House Platform – PLAN

## What's implemented

**Art direction: Editorial Brutalist (v2).** The original editorial-minimal design was fully
scrapped and rebuilt as an Awwwards-tier brutalist system: colossal Archivo grotesk on a hard
2px-ruled grid, concrete-paper / pure-ink / hot-flare palette, radius-0, offset solid shadows.
Signature moments: a full-viewport **WebGL halftone shader** hero (raw GLSL, pointer-reactive),
**RGB-shift glitch** image reveals, a **blend-difference cursor**, **magnetic** buttons, infinite
**marquees**, a **route-wipe** page transition, pinned scroll set-pieces, and momentum **drag
carousels** — all reduced-motion / capability gated. Prior features (Unsplash imagery, count-up
results, story spine, smooth scroll) were carried across into the new language.

**Done:**
- Foundations: Next.js (App Router/TS) + Tailwind v4 + shadcn/ui (base-ui), GSAP + ScrollTrigger
  + Draggable/InertiaPlugin, Lenis smooth scroll, react-three-fiber/drei, Playwright. Brand tokens
  (ink/paper/flare, Fraunces/Inter/JetBrains Mono), centralized motion tokens, `SiteHeader`/
  `SiteFooter`, custom cursor.
- Real imagery via the Unsplash API (`src/lib/unsplash.ts`), keyed by search query per project/
  gallery slot, resolved server-side and passed down to client components; falls back to a
  generative gradient + grain placeholder automatically when no key/fetch fails.
- Landing page (`/`): Hero (mask-wipe reveal + small ambient Three.js accent, pointer/scroll
  reactive), Pillars, Selected Work (the one deliberate pinned/scrubbed crossfade), Capabilities
  strip (staggered chain-reveal), Client proof (momentum drag carousel), CTA.
- Work grid (`/work`) with tag filtering and staggered tile reveals, and full case study template
  (`/work/[slug]`) — hero, brief, parallax full-bleed break, pinned Approach steps, drag-carousel
  detail gallery, scroll-scrubbed video moment, count-up results, credits, next-case teaser — plus
  a scroll-progress "story spine" tying the whole read together. Driven by 3 seeded case studies.
- Client/platform area: `/login` (mock, no real auth), `/dashboard`, `/projects`,
  `/projects/[id]`, `/briefs`, `/briefs/new` (3-step wizard with validation, in-memory state).
- Playwright e2e suite (`tests/e2e/`): hero load, case-study navigation, scroll/hover without JS
  errors, drag-carousel interaction, dashboard project list, brief creation flow. All passing.

**Not built (see Non-goals / scope note below):**
- The broader marketing page set from §3 (About, Services, Process, Studio, Insights, Contact,
  Style guide) — DESIGN_BRIEF.md scopes the first pass to Landing + one case study + Work grid +
  Dashboard, so those pages were left out rather than stubbed thin.
- Visual regression testing (functional e2e coverage exists; no screenshot-diffing configured).
- Persistent backend/auth — briefs and projects are in-memory/mock, as scoped for v1.

## 1. High-level vision
Build a bespoke-feeling, narrative-driven platform for a creative agency + production house. The experience should feel like a crafted film title sequence turned into an interface: minimal, confident, and cinematic, with motion that feels choreographed, not "library spam".

The site must:
- Showcase high-end design, motion, and interaction craft.
- Provide real "platform" functionality (client area, project trackers, briefs).
- Demonstrate technical depth: GSAP, Three.js, micro-interactions, and robust testing.

## 2. Core tech stack
- **Framework**: Next.js (App Router, RSC)
- **Styling**: Tailwind CSS + shadcn/ui, with custom design tokens and typography
- **Motion**:
  - GSAP for scroll timelines, section reveals, micro transitions
  - Lenis / Smooth Scroll (or similar) for scroll smoothing
  - Optional Three.js / react-three-fiber for hero / scene transitions
- **Testing**: Playwright for E2E flows and visual regression (key pages and motion-critical states)
- **State layer**: Minimal (React state + server components); avoid Redux-style overhead unless justified

## 3. Page map (MVP but feels big)

### Public / marketing
- **Landing (`/`)**
  - Cinematic hero: agency reel-style scroll, with pinned frames and overlapping typography.
  - Narrative sections:
    - "What we do" – three pillars: Strategy, Design, Production.
    - "How we work" – horizontal scroll or stepped process.
    - Selected work – scroll-linked case study teasers with hover reveals.
    - Call-to-action – start a brief / book a session.
- **About (`/about`)**
  - Narrative timeline of the studio with scroll-linked transitions.
  - Principle-based section: design philosophy, motion principles, "no AI slop" manifesto.
  - Team highlights with minimal portraits, micro hover states.
- **Services (`/services`)**
  - Structured service cards: Brand, Product, Campaign, Content, Motion.
  - Each service reveals a mini interaction (e.g. subtle 3D tilt, masked imagery).
- **Work – grid (`/work`)**
  - Asymmetric grid with hover motion and tags (industry, service, format).
  - Filters with smooth animated transitions.
- **Work – case study detail (`/work/[slug]`)**
  - Hero with ambient motion (GSAP or Three.js).
  - Structured narrative: Problem → Strategy → Execution → Impact.
  - Mixed media layout: images, video embeds, detail shots, process artifacts.
  - Scroll-driven storytelling, parallax, and pinned sections.
- **Process (`/process`)**
  - Stepper explaining how engagements work (Discovery → Concept → Production → Launch).
  - Scroll-synced diagrams, morphing lines, progress indicators.
- **Studio (`/studio`)**
  - Culture, behind-the-scenes, principles, tools of the trade.
  - Environmental shots, grid of "frames" representing ongoing projects.
- **Insights (`/insights`)**
  - Blog / articles / thought pieces – simple but elegant list + detail pages.
  - Great typography, reading progress indicator, subtle entry animations.
- **Contact (`/contact`)**
  - Bespoke contact form with conditional logic.
  - "Start a brief" mode vs "General contact".
  - Embedded calendar or call-to-action to schedule.
- **Style guide (`/style-guide`)**
  - Internal-facing but public: design tokens, typography, spacing, components.
  - Shows shadcn/ui components re-skinned for the brand.

### Client / platform area
- **Login (`/login`)** – Minimal sign-in for clients.
- **Client dashboard (`/dashboard`)**
  - High-level view: current projects, status tags, next milestones.
  - Timeline / kanban strip with subtle animation.
- **Projects list (`/projects`)** – Cards for each project: progress, deadlines, main contact.
- **Project detail (`/projects/[id]`)**
  - Milestones, deliverables, approvals, and version history.
  - Area for embedding WIP frames or reels.
- **Briefs (`/briefs`, `/briefs/new`)**
  - New brief wizard with steps and validation.
  - List of submitted briefs and status.

## 4. Experience & UX principles
- **Visual hierarchy first**: Strong typographic scale. Comfortable line-length, generous whitespace, limited color accents.
- **Motion principles**: Purposeful — every animation either clarifies structure, reinforces narrative, or rewards interaction. Consistent easing, duration, and hierarchy of motion. No bouncing, chaotic zooming, or random staggering.
- **Scroll philosophy**: Mostly linear, with a few cinematic "set pieces". Use GSAP ScrollTrigger to pin entire sections and orchestrate transitions.
- **Accessibility**: Respect reduced motion preferences. Sufficient contrast, focus states, keyboard navigation.

## 5. Implementation phases

### Phase 1 – Foundations
- Setup Next.js, Tailwind, shadcn/ui.
- Establish base design tokens (colors, font sizes, spacing, radii).
- Global layout: header, nav, footer, base typography.
- Implement smooth scroll (Lenis or similar).

### Phase 2 – Marketing experience
- Build landing, work grid, and one case study in full fidelity.
- Integrate GSAP for scroll and section reveals.
- Add motion primitives components (`<FadeIn>`, `<SlideUp>`, `<ParallaxImage>`, etc.).
- Optional: integrate Three.js scene in hero or process page.

### Phase 3 – Platform features
- Build login, dashboard, projects list, project detail.
- Implement dummy data layer (local JSON or mocked API).
- Design and build the brief submission flow.

### Phase 4 – Polish and testing
- Add Playwright tests for core flows (landing, work view, brief creation) and visual regression on key motion-critical pages.
- Performance tuning: Lighthouse checks, image optimization, code-splitting.
- Accessibility pass.

## 6. Non-goals
- No generic templates, theme-based layouts, or uncurated animation spam.
- No auto-generated copy that reads like AI filler.
- No complex backend or auth system in v1; keep it mock or simple.

---

_See "What's implemented" at the top of this file for current status._
