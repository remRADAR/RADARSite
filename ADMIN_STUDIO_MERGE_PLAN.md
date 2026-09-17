# RADARSite Studio Admin Merge Plan

## Objective

Merge the existing `RadarAdminPanel` capabilities into the new split-screen RADAR Studio without removing authentication, shared persistence, CMS content management, media controls, SEO settings, social profiles, or existing site behavior.

The migration should produce one administrative experience backed by one persistence path. The new Studio should become the presentation layer, while the existing secure `/api/studio` route remains the source of truth for authenticated reads and writes until a deliberate schema migration is complete.

> **Non-negotiable requirement:** no existing admin capability is removed until the replacement control is implemented, connected to the same persistence path, and covered by a regression check.

## Current state and risks

The existing admin panel already provides password authentication, session cookies, shared Neon-backed settings, CMS archive editing, media overrides, SEO fields, social profiles, playlist settings, featured work selection, and security protections. These capabilities are implemented in `src/components/platform/RadarAdminPanel.tsx` and `src/app/api/studio/route.ts`.

The new Studio provides a split-screen editor and local configuration state in `src/components/admin/AdminSplitStudio.tsx`. Its current save route, `src/app/api/admin/save-config/route.ts`, only validates and echoes the request. It does not persist data or enforce authentication. The new `GlobalSiteConfig` also overlaps with `SiteOverrides`, which creates two competing configuration models.

The merge must therefore prioritize **capability preservation**, **single-source persistence**, and **backward-compatible rendering** over immediate replacement of the old data model.

## Target architecture

The target architecture has four layers.

### 1. Secure Studio shell

`/admin` renders the new split-screen Studio shell. The shell owns navigation, authentication status, save state, responsive layout, and the live preview. It does not own a second independent persistence system.

The shell should expose these workspace areas:

| Workspace | Existing capability preserved | New Studio capability |
|---|---|---|
| Overview | Shared connection status, session status, publish/reset actions | Live counts, preview health, unsaved-change state |
| Site identity | Logo, logo image, RADARMe URL, geo signature | Instant preview of identity changes |
| Hero and tickers | Hero media overrides, ticker icon, ticker items, playlist settings | Hero copy, four ticker editors, live preview |
| Editorial and work | Featured slug selection, CMS content collections | AKT!V boxes, selected work cards, ordering, visibility |
| Process, proof, and CTA | Existing process, testimonial, CTA fields | Direct editors with preview synchronization |
| Media library | Managed media asset overrides | Inline asset replacement and preview |
| SEO and social | Metadata, canonical URL, social image, profile links | Form-based editing with validation |
| CMS archive | Articles, pages, drafts, published records, JSON editor | Structured content editor or preserved advanced editor |
| Access and persistence | Login, logout, shared database status, security errors | Persistent session indicator and save feedback |

### 2. Compatibility configuration adapter

Keep `SiteOverrides` as the initial persisted contract. Add a typed adapter that maps between `SiteOverrides` and the new Studio view model.

Recommended functions:

```ts
loadStudioViewModel(): Promise<StudioViewModel>
siteOverridesToStudioConfig(overrides: SiteOverrides): GlobalSiteConfig
studioConfigToSiteOverrides(config: GlobalSiteConfig, current: SiteOverrides): SiteOverrides
normalizeStudioViewModel(input: unknown): StudioViewModel
```

The adapter must preserve fields that are not yet represented in the new schema. It must not replace the whole object with a partial payload. Unknown or unedited legacy fields should pass through unchanged.

The new `GlobalSiteConfig` should become a UI model rather than a second database model. Once all consumers use the unified model, a separate database migration can be considered.

### 3. Existing secure persistence route

Continue using `/api/studio` for authenticated shared reads and writes. Extend it only where necessary to support the new Studio view model.

The route must retain:

- Same-origin mutation checks
- Rate limiting
- Password login throttling
- HttpOnly session cookies
- Admin session validation
- Database availability handling
- Payload-size validation
- Existing content persistence behavior

Either remove `/api/admin/save-config` or convert it into a thin authenticated compatibility endpoint that delegates to the same `writeStudioSettings` function. It must never claim success without persistence.

### 4. Preview data bridge

The live preview should receive the current unsaved draft directly from Studio state. The public site should continue reading persisted settings through the existing server/client override path.

After a successful save, the Studio should update local browser state and dispatch the existing `radar-overrides-updated` event. A failed save must not update the browser’s persisted copy or report a published state.

## Phased implementation plan

### Phase 0: Freeze behavior and create a capability inventory

Before changing the route, document every existing control and its destination field. Record whether the field is stored in `settings`, `content`, localStorage, or a derived data source.

Create a capability matrix with these columns:

- Control name
- Existing component and field
- Existing API payload
- New Studio location
- Public consumer
- Migration status
- Regression test

Capture a baseline of the existing `/`, `/admin`, `/dashboard`, archive pages, and login flow. Do not replace `/admin` during this phase.

### Phase 1: Extract shared admin primitives

Refactor `RadarAdminPanel` before integrating it into the new shell. Extract reusable components for:

- Authentication and session status
- Save, reset, and error feedback
- Media asset rows
- Social profile rows
- SEO fields
- CMS content collection editing
- Featured work selection
- JSON validation and formatting

The old panel should continue to render from these extracted components during the refactor. This keeps the first step behavior-preserving.

### Phase 2: Define the Studio view model and adapter

Create a view model that includes all current controls rather than only the new homepage fields. Use explicit nested types and deep normalization.

The normalization layer must merge nested defaults at every level. It should validate URLs, strings, booleans, arrays, image paths, and bounded numeric values. It should reject malformed records without discarding unrelated valid settings.

Preserve the following legacy fields even if the first Studio tab does not expose them:

- `media`
- `logoText`
- `logoImage`
- `tickerIcon`
- `tickerIconImage`
- `heroHeadline`
- `heroSubheadline`
- `tickerItems`
- `featuredSlugs`
- `seoTitle`
- `seoDescription`
- `socialImage`
- `canonicalOverride`
- `socialLinks`
- `radarMeUrl`
- `playlistId`
- `playlistLabel`
- `playlistEnabled`
- `geoSignature`
- `motherlandBanner`
- `ecosystemNav`
- `caseStudies`
- `processSteps`
- `testimonials`
- `footerNav`
- `homepageVideo`
- `youtubeFeed`
- `contactCTA`

### Phase 3: Add authentication to the new Studio shell

The new `/admin` page should load the existing shared settings and report whether the shared database is configured. If shared persistence is configured and there is no valid session, show the login control before allowing publish or reset operations.

Local draft editing may remain available before login, but the interface must clearly distinguish:

- Unsaved local draft
- Saved to this browser only
- Authenticated shared save
- Failed shared save

Do not store admin passwords or session tokens in localStorage. Continue using the existing HttpOnly cookie session.

### Phase 4: Integrate existing controls into Studio tabs

Move the existing controls into the new workspace without changing their underlying field semantics.

The **Overview** tab should include connection state, authentication state, draft status, save/reset actions, and a concise change summary.

The **Hero and tickers** tab should include hero copy, hero media, coordinates, ticker icon assets, ticker 1 audio/player settings, ticker 2 hero marquee, ticker 3 partner marquee, and ticker 4 footer marquee.

The **Editorial and work** tab should include AKT!V boxes, selected work cards, featured slug selection, process steps, testimonials, and homepage video settings.

The **Media and SEO** tab should preserve the media library, metadata, canonical override, social image, and description controls.

The **Navigation and social** tab should preserve header links, RADARMe, footer navigation, and all social profile toggles.

The **CMS archive** tab should initially retain the existing JSON editor if a structured editor is not ready. Improving the layout is optional; preserving editing behavior is mandatory.

### Phase 5: Connect all public consumers

Do not mark a Studio field complete until its value changes the intended public component.

Connect the following consumers explicitly:

- `Hero.tsx`: copy, coordinates, hero media, ticker 2, ticker icon
- `PillarsSection.tsx`: AKT!V box order, labels, descriptions, links, visibility
- `SelectedWork.tsx`: selected work records, visibility, order, title, description, image, destination
- Process section: process steps and visibility
- `ClientProof.tsx`: quote, attribution, ticker 3 partners
- `CTASection.tsx`: headline, email, button label, visibility
- `PlaylistFloater.tsx` or `FloatingAudio.tsx`: ticker 1 settings
- `SiteFooter.tsx`: ticker 4, footer navigation, social profile visibility and URLs
- Site header: logo, navigation links, external targets
- Metadata layer: SEO title, description, canonical URL, social image

Remove duplicated fallback logic only after the new adapter provides equivalent defaults.

### Phase 6: Replace the route only after parity is proven

Keep a temporary feature flag or route switch so the old panel can be restored quickly. Do not delete `RadarAdminPanel` until the parity checklist passes.

The replacement criteria are:

1. Existing users can log in and log out.
2. Shared settings load from the same database.
3. Shared settings save through the authenticated route.
4. CMS content editing still works.
5. Media, SEO, social, playlist, and featured-content controls still work.
6. New Studio controls update the live preview without delay.
7. Saved changes appear on a fresh browser session.
8. Failed saves do not report success or overwrite the last good configuration.
9. Reset behavior is authenticated and preserves data safety.
10. Public pages render correctly with legacy settings, new settings, and partially populated settings.

### Phase 7: Remove duplication and document the contract

After parity is established, remove only dead UI code. Keep the API compatibility layer if stored data or external scripts may still depend on it.

Document:

- The canonical persisted schema
- The adapter and normalization rules
- Which fields are local drafts versus shared settings
- The authentication flow
- The save and reset semantics
- How to add a new Studio field safely

## Testing strategy

### Automated checks

Add unit tests for:

- Deep configuration normalization
- Legacy-to-Studio mapping
- Studio-to-legacy mapping
- URL and payload validation
- Preservation of unknown legacy fields
- Failed-save behavior

Add API tests for:

- Unauthenticated GET
- Successful authenticated GET
- Rejected unauthenticated PUT
- Successful settings PUT
- Successful content PUT
- Same-origin rejection
- Rate-limit behavior
- Oversized payload rejection

Add end-to-end tests for:

- Login and logout
- Loading existing settings
- Editing and saving each Studio tab
- Fresh-session persistence
- Reset behavior
- CMS archive editing
- Media replacement
- SEO and social edits
- Mobile/tablet/desktop preview switching

### Manual verification

Verify the following scenarios in a browser:

1. An existing database-backed installation opens without losing settings.
2. A user can edit a draft without logging in, but cannot publish it without authentication.
3. A successful save updates the public page after reload.
4. A failed save leaves the previous saved configuration intact.
5. An empty or partially malformed localStorage record falls back safely.
6. Existing content records remain available after the Studio route replacement.
7. The public site does not change merely because a draft is being edited.

## Rollout and rollback

Use a staged rollout.

First, ship the adapter, extracted controls, and tests while the existing panel remains active. Next, enable the new Studio for internal users behind a feature flag. Compare save and read behavior against the existing panel. Then enable the new Studio for all admins after the parity checklist passes.

Keep the old panel accessible through a temporary internal route such as `/admin-legacy` during the rollout. If shared persistence, CMS content, or authentication fails, switch the feature flag back to the old panel without reverting database data.

Do not perform a destructive schema migration during the UI merge. If a later migration from `SiteOverrides` to `GlobalSiteConfig` is required, run it as a separate, reversible project with backups and a compatibility reader.

## Definition of done

The merge is complete when `/admin` provides the new split-screen preview and all existing admin capabilities remain available through the same authenticated persistence path. The public site must consume saved values consistently across fresh sessions and devices. Lint, TypeScript, production build, API tests, and end-to-end regression tests must pass.

The final implementation should have one canonical persistence contract, one authentication path, one normalization layer, and no UI control that reports success without a verified save.

## References

[1]: https://github.com/remRADAR/RADARSite "RADARSite repository"
[2]: https://nextjs.org/docs/app "Next.js App Router documentation"
