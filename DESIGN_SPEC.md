Landing Page
Mood & Visual Direction
Editorial confidence over startup polish — think a film studio's internal deck, not a SaaS homepage. Large serif or grotesk display type carries the authorship; color stays almost monochrome (near-black, near-white, one accent used sparingly as a cue rather than decoration) so the work itself supplies the color. Motion is slow, deliberate, and reveals rather than dazzles — nothing bounces, nothing loops for attention.

Layout & Sections
1. Hero Full-viewport. Left-aligned oversized wordmark/statement (e.g. "We build the things worth remembering.") set in a display serif, 96–140px, max 9–10 words, tight line-height. Below it, a single-line positioning statement in a small mono/grotesk label style. No CTA button in the fold — a single down-chevron or scroll cue bottom-left. Background: a muted full-bleed video/still of recent work, dimmed under a near-black gradient at the bottom third so type stays legible.

2. What We Do (Pillars) Three to four service pillars (e.g. Brand, Film, Product, Culture) laid out as a horizontal list of large numbered rows (01, 02, 03), each row full-width, label + one-line description right-aligned, thin hairline dividers. Not cards — rows that feel like a table of contents for the agency.

3. Selected Work The core of the page. A vertical stack of full-bleed project entries, alternating text-left/image-right and image-left/text-right. Each entry: client name (small caps label), project title (large serif), one-line result/insight, "View case study →" text link. Imagery is large (16:9 or taller), no card chrome, no shadows.

4. Capabilities / Process strip A compact horizontal band — 4–5 short capability tags or a one-line process statement ("Strategy → Craft → Production → Launch") set in mono type against a solid dark or accent-tinted background. A tonal break from the white sections above/below.

5. Proof / Clients Understated logo row (grayscale, low-contrast) or a single rotating quote from a client, large serif quote type, minimal attribution line beneath. No star ratings, no stat-counters.

6. CTA / Contact Full-bleed, dark background. Large serif prompt ("Let's make something worth talking about.") plus a single email link or button, generously spaced. Footer directly below: minimal — logo mark, nav repeat, social, copyright.

Visual Hierarchy
Focal point per section: Hero = the statement line; Pillars = the numeral; Work = the imagery (text is secondary, small, confident); CTA = the single line of serif type.
Type scale: display (96–140px) for hero/CTA statements, h2 (48–64px) for project titles, body (18–20px) for descriptions — never below 16px, never grey-on-white lighter than ~45% contrast.
Spacing does the hierarchy work: sections use 120–200px vertical rhythm; nothing is dense. Whitespace signals importance more than size does.
Motion & Interactions
Scroll: No parallax gimmicks. Section transitions use a subtle fade/rise (16–24px translate + opacity, 0.6–0.8s ease-out) triggered on enter, via GSAP ScrollTrigger, staggered slightly across children (label → title → image).
Hero moment: On load, wordmark characters or lines reveal via clip-path/mask wipe (bottom-to-top), 0.9s, single easing curve reused everywhere for consistency. Background video fades in after type settles, not before.
Pinning: In the Selected Work section, pin the viewport briefly per project row (ScrollTrigger pin, scrub) so image + text cross-fade to the next entry rather than hard-cutting — used sparingly, only here.
Hover: Work entries — image scales 1.0→1.03 with a slow 1.2s ease on hover, text link underline draws left-to-right. Nav links get a 2px underline that grows from center. No color-shift hovers; motion-only feedback.
Micro-interactions: Cursor can switch to a small circular "View" label when hovering work imagery (custom cursor follower), reinforcing that images are clickable without adding visible buttons.
Suggested Assets
Hero: 4–6s muted looping video reel (fast cuts of past work) or a single strong still if no reel exists.
Work entries: high-res stills/video snippets per case study, consistent aspect ratio.
Optional subtle grain/noise overlay texture (very low opacity) for warmth — placeholder only until real footage lands.
Component Structure
<Hero> — video/still bg, animated headline (custom split-text + GSAP)
<PillarsSection> — numbered row list, hairline dividers (custom)
<WorkEntry> (repeated in <CaseStudyGrid> or <SelectedWork>) — alternating media/text layout, pinned scroll variant
<CapabilitiesStrip> — dark band, mono tags (shadcn Badge-derived if styled down, otherwise custom)
<ClientProof> — logo row or quote (shadcn Carousel acceptable for quote rotation, restyled)
<CTASection> — dark full-bleed, single link/button (shadcn Button restyled, ghost/underline variant)
<SiteFooter> — custom, minimal
<CustomCursor> — global, hover-state aware, custom (no shadcn equivalent)
shadcn primitives are fine for structural/utility bits (Badge, Button, Carousel, Separator) as long as all visual styling is overridden — no default shadcn skin should ship.
Case Study Page
Mood & Visual Direction
Long-form and cinematic — the page reads like a short editorial piece about the project, not a portfolio tile blown up. Generous full-bleed imagery punctuated by short, confident text blocks. Same restrained palette as the landing page so the work's own color leads.

Layout & Sections
1. Case Hero Full-viewport. Top-left: client name + project title (small label + large serif headline). Top-right or below: 3–4 metadata pairs (Role, Year, Scope, Deliverables) in mono type, tightly aligned in a small grid. Full-bleed hero image/video beneath, no overlay text on top of it — let it breathe after the headline block.

2. The Brief Two-column: left a short label ("The Challenge"), right 2–3 sentences of scene-setting copy, generous line-height, max ~60ch line length. Plenty of top/bottom padding — this is a pause, not a wall of text.

3. Full-bleed Imagery Break One or two large images/video, full-bleed, no text — a breathing section that lets the work speak.

4. The Approach / Process A horizontal 2–4 step sequence (Discover → Define → Design → Deliver), each step a short label + one line, laid out like the landing page's pillar rows but scoped to this project. Optional inline supporting imagery per step (smaller, inset).

5. Detail Gallery Asymmetric image grid — mix of full-bleed, two-up, and inset crops — showing craft detail (typography specimens, product shots, film stills). Captions in small mono type, bottom-left of each image.

6. Video Moment (if applicable) A pinned, full-bleed video block — scroll scrubs playback position (ScrollTrigger + video currentTime binding) for a "cinematic reveal" feel; falls back to autoplay-muted-loop if scroll-scrub isn't feasible.

7. Results Three or four outcome stats or qualitative results, large serif numerals/short statements, laid out in a simple row — kept honest and sparse (no invented metrics).

8. Credits Small, quiet block: team/collaborators, tools, partners — mono type, low visual weight, feels like film credits.

9. Next Case Study Full-bleed teaser for the next project — mirrors the landing page's work-entry pattern, title + "Next" label, click-through transitions to the next case study.

Visual Hierarchy
Focal point per section: Hero = title + hero image; Brief = the short paragraph (isolated by whitespace); Gallery = the images (captions recede); Results = the numerals.
Titles at 64–96px, metadata/labels at 13–14px uppercase mono with wide letter-spacing for contrast against the serif display type, body copy 18–20px.
Consistent large top/bottom margins (140–200px) between major sections reinforce this as a slow, considered read.
Motion & Interactions
Scroll: Straightforward fade/rise reveals per section (same easing/timing as landing page for system consistency). No page-wide scroll-jacking except the two intentional pinned moments below.
Hero: Title reveals via mask-wipe on load; hero media fades/scales in from 1.05→1.0 over 1.2s.
Pinned moment 1 — Approach steps: Pin the section while steps cross-fade/slide in sequence as the user scrolls, so the process feels choreographed rather than listed.
Pinned moment 2 — Video block: Pin video full-bleed, scrub playback tied to scroll position for a controlled cinematic reveal.
Gallery hover: Images scale subtly (1.0→1.02) on hover; captions fade in from 0 opacity.
Next Case Study transition: Clicking crossfades/wipes to the next page (shared-element style transition on the title) rather than a hard navigation cut, if the routing stack supports it (Next.js App Router + view transitions API or a GSAP-driven route transition).
Suggested Assets
Hero: full-bleed still or short video of the finished work.
Process: optional small process/sketch imagery per step.
Gallery: 6–10 detail shots at varied crops (full-bleed, half, third).
One video asset for the pinned cinematic moment, if the project has motion deliverables.
Component Structure
<CaseHero> — title, metadata grid, hero media
<CaseBrief> — two-column label/copy block (custom, reusable across cases)
<FullBleedMedia> — single-purpose image/video break (reused for section 3 and standalone breaks)
<ApproachSteps> — pinned step sequence (custom GSAP, ScrollTrigger pin)
<DetailGallery> — asymmetric grid, per-item hover scale (custom; could use shadcn AspectRatio per image tile)
<ScrubVideo> — pinned, scroll-scrubbed video (custom, no shadcn equivalent)
<ResultsRow> — stat/outcome row (custom, plain flex + large type — no chart libs needed for 3–4 numbers)
<CreditsBlock> — quiet metadata list (custom, or shadcn Separator between rows)
<NextCaseTeaser> — full-bleed link-through, shared with landing page's <WorkEntry> where possible
Shared with landing page: <CustomCursor>, type/motion tokens (easing curve, spacing scale) should live in one config so both pages stay visually consistent.