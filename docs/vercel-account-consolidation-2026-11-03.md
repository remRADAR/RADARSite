# Vercel account consolidation runbook (2026-11-03 — Vibe agent)

Owner decision (2026-11-03): production stays on the **Cloudflare Worker** (plan of record);
the **new Vercel team `ontheradar` (project `radar-site`)** becomes the single Vercel
home (staging/preview); the old Vercel team is retired. Owner confirmed the current
build on `radar-site` enacts the components missed from the original design.

## Verified state (2026-11-03)

- The Vercel GitHub integration is connected and active for TWO teams; every push to this
  repo triggers builds on all four projects below (evidence: commit statuses on PR #39 heads
  f81ce729 and 17e8ee8, all `success`):
  - OLD team `remradars-projects`: `radarsite` (live production, serves radarcharts.net),
    `radarsite-staging`, `radarsite-supabase-preview-20260929`
  - NEW team `ontheradar`: `radar-site` (new design, radar-site-hazel)
- DNS for radarcharts.net (verified via dns.google): nameservers are **Cloudflare**
  (fonzie/nataly.ns.cloudflare.com); A `@` = 76.76.21.21 (Vercel anycast); www CNAME =
  cname.vercel-dns.com; MX on Cloudflare Email Routing (route1–3.mx.cloudflare.net).
- Consequence: **no registrar or nameserver change is needed for any migration path.**
  Email is unaffected by A-record changes (MX records separate).

## Recommended disposition of the old team's projects

| Old-team project | Disposition |
| --- | --- |
| `radarsite` | KEEP untouched until the Cloudflare cutover is verified live, then remove the radarcharts.net domain claim and delete (or keep read-only for a week) |
| `radarsite-staging` (Vercel project) | DELETE — duplicate of the repo; its name collides confusingly with the Cloudflare Worker of the same name |
| `radarsite-supabase-preview-20260929` | DELETE — stale 2026-09-29 experiment |

## Migration sequence

### Phase A — repo + staging prep (no production impact)

1. **Old team build noise (optional but recommended now):** in the OLD team's Vercel
   dashboard, unlink `radarsite-staging` and `radarsite-supabase-preview-20260929` from
   the GitHub repo (or disconnect the repo from the old team's integration entirely).
   This stops 2–3 extra builds per push. Leave `radarsite` linked; it is the live
   production until cutover.
2. **New team env vars:** in `ontheradar` → `radar-site` → Settings → Environment
   Variables, add the content-chain variables from
   docs/deployment-env-checklist-2026-11-03.md (minimum: DATABASE_URL, STUDIO_ADMIN_PASSWORD,
   the R2 set). This fixes the empty EditorialTree on radar-site-hazel.
3. **Cloudflare Worker deploy:** add GitHub repo secrets CLOUDFLARE_API_TOKEN +
   CLOUDFLARE_ACCOUNT_ID (repo Settings → Secrets and variables → Actions), merge PR #39,
   then run the "Deploy (Cloudflare staging)" workflow from the Actions tab.
4. **Worker runtime env vars + R2 seed:** set the runtime variables per the checklist doc;
   seed the R2 content store (`content/radarsite-content-v1.json`) via the Studio
   save-once flow or the Neon → R2 seeding runbook in
   docs/deployment-reconciliation-2026-11-01.md.
5. **Verify on the Worker's *.workers.dev URL** (NOT the domain yet): homepage
   EditorialTree, article pages, media rendering (CSP origin), legends route, social icons,
   theme toggle, Studio panel.

### Phase B — cutover (owner-only; ONE change, minutes)

6. In the Cloudflare dashboard: Workers & Pages → `radarsite-staging` → Settings →
   Domains & Routes → Add **Custom Domain** `radarcharts.net`. Because the domain's DNS
   is already in the same Cloudflare account, Cloudflare manages the record change
   automatically (replaces the Vercel A record path; old A record TTL is 300 s, so
   propagation is fast). www: add a second custom domain or a redirect rule per preference.
7. **Verify production on the domain** immediately after.
8. **Retire the old team:** remove the radarcharts.net domain claim from the old
   `radarsite` project, delete `radarsite-staging` and
   `radarsite-supabase-preview-20260929`, then delete or archive `radarsite`.
   The old Vercel account then no longer serves anything for this site.

### Risk notes

- The only gap risk is step 6 itself; it is eliminated by completing step 5 first
  (a verified Worker) — the switch is then a DNS-level flip inside one Cloudflare account.
- MX/email records are untouched throughout.
- The old site stays reachable at its own *.vercel.app URL until step 8, as a fallback.

## Verified vs unverified

Verified: two-team integration state and per-project deploy success (GitHub commit
statuses), DNS records (dns.google), Cloudflare nameservers. NOT verified: inside either
Vercel dashboard (no Vercel access from this agent) — project env vars, integration link
controls, and domain-claim state must be confirmed by the owner there. Exact dashboard
menu names may vary slightly by Vercel version.
