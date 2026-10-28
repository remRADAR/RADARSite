# RADARSite — GitHub Codespaces Setup

This repo is Codespaces-ready. `.devcontainer/devcontainer.json` defines the container, ports, VS Code extensions/settings, and MCP servers; `.mcp.json` registers the same MCP servers for Claude Code (project scope). No secrets are committed — they are injected as Codespaces secrets.

## Create the Codespace

1. Repo → **Code** → **Codespaces** → **+** (or https://github.com/codespaces/new?repo=remRADAR/RADARSite).
2. Machine type: **4-core / 16 GB** recommended (Next 16 + Playwright + sharp builds get slow on 2-core). Choose an **x64 Linux** machine — `sharp` pins linux-x64 binaries.
3. First creation runs `post-create.sh` automatically: `npm install`, Playwright Chromium, MCP image pre-pull, and `.env.local` creation. Allow ~5–10 minutes.
4. Optional but recommended: **Settings → Codespaces → Prebuilds** (build with the dev container configuration) so future codespaces start in ~1 minute.

## One-time: add Codespaces secrets

Repo **Settings → Secrets and variables → Codespaces → New secret**. Secrets are injected as environment variables at container creation; `post-create.sh` copies any that match a key in `.env.local.example` into `.env.local` (gitignored).

| Secret | Powers | Needed for |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres (Studio live CMS/settings) | Studio DB-backed work |
| `STUDIO_ADMIN_PASSWORD` | Studio admin auth | Studio |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL` | Cloudflare R2 media storage + WebP derivatives | Media work |
| `UNSPLASH_ACCESS_KEY` | MediaFrame imagery (falls back to gradient if unset) | Optional |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error reporting | Optional |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Analytics / Search Console | Optional |
| `NEXT_PUBLIC_SPLINE_SCENE` | Spline 3D hero (halftone fallback if unset) | Optional |
| `WORDPRESS_MEDIA_AUTHORIZATION` | WordPress media fetch auth | Migration scripts |
| `CACHE_MAINTENANCE_TOKEN` | Cache-maintenance worker secret | Ops only |
| `NOTION_API_KEY`, `RADAR_NOTION_DATA_SOURCE_ID`, `RADAR_NOTION_SYNC_SECRET` | Notion → RADARSite publishing | Publishing work |
| `NEON_API_KEY` | Neon MCP server (natural-language DB access) | MCP only |
| `GITHUB_MCP_PAT` | GitHub MCP server (fine-grained PAT, scoped to this repo) | MCP only |

Rules that always apply:
- Keep `RADAR_NOTION_PUBLISHING_ENABLED=false` until staging auth, schema, dry-run, and publishing tests are approved.
- Never expose server-only secrets through `NEXT_PUBLIC_*` variables.
- Without `DATABASE_URL`, Studio runs in browser-only fallback mode by design.

## Ports (auto-forwarded)

| Port | Purpose |
| --- | --- |
| 3000 | `npm run dev` (Next.js) |
| 3001 | `npm run dev:vinext` (Vite/vinext path) |
| 3100 | Playwright `webServer` (used by `npm run test:e2e`) |
| 9229 | Node.js debugger |

## MCP servers

Registered for VS Code Copilot (via `customizations.vscode.mcp` in the devcontainer) and Claude Code (via `.mcp.json`). Verify with **MCP: List Servers** in VS Code or `/mcp` in Claude Code.

| Server | Source | Purpose | Auth |
| --- | --- | --- | --- |
| `github` | `ghcr.io/github/github-mcp-server` (official image, via `.devcontainer/mcp-github.sh`) | Issues, PRs, code search, repo ops | `GITHUB_MCP_PAT` secret, falls back to the Codespaces `GITHUB_TOKEN` |
| `playwright` | `@playwright/mcp` (official) | Drive/inspect the running site in a real browser; screenshots, clicks, traces | none |
| `neon` | `@neondatabase/mcp-server-neon` (official) | List/query/migrate the Neon Postgres project in natural language | `NEON_API_KEY` secret |
| `context7` | `@upstash/context7-mcp` | Up-to-date docs for Next.js, React, Tailwind, GSAP, three.js | none (optional `CONTEXT7_API_KEY` for higher limits) |

Notes:
- The `github` server uses the official Docker image; the deprecated `@modelcontextprotocol/server-github` npm package is deliberately not used. If you don't need it, remove the `github` entry and the `docker-in-docker` feature to slim the container.
- Alternative (no Docker): GitHub's hosted remote server — `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp/","headers":{"Authorization":"Bearer YOUR_GITHUB_PAT"}}'`. Or add a read-only variant with the `/readonly` path.
- If you want Cloudflare MCP as well, the hosted servers are available: `https://docs.mcp.cloudflare.com/sse`, `https://bindings.mcp.cloudflare.com/sse`, `https://observability.mcp.cloudflare.com/sse` (Workers docs, bindings, logs/telemetry for the vinext deploy path).

## Daily workflow

```bash
npm run dev            # Next.js dev server  → http://localhost:3000
npm run dev:vinext     # Vite/vinext dev     → http://localhost:3001
npm test               # lint + typecheck
npm run test:e2e       # Playwright (starts its own dev server on :3100)
npm run test:a11y      # axe accessibility checks
npm run test:csp       # CSP contract test
npm run cms:diagnose   # CMS diagnostics
npm run build          # production build (RADAR_SKIP_DATABASE=1)
```

Cloudflare deploy path (vinext):

```bash
npx wrangler login     # one-time
npm run build:vinext
npm run deploy:vinext
```

## Security notes

- `.env.local` is gitignored (`.env*` with `!.env.local.example`) — secrets stay in the container/Codespaces secrets only.
- Codespaces secrets are stored server-side by GitHub and never printed into the repo, terminal history files, or PRs.
- The auto-injected `GITHUB_TOKEN` is ephemeral and scoped to the codespace; for the GitHub MCP server a dedicated fine-grained PAT (`GITHUB_MCP_PAT`) is cleaner and revocable.

## Troubleshooting

- **Change secrets → restart**: Codespaces secrets are injected at creation; after editing them, run **Codespaces: Rebuild Container** (full rebuild).
- **Slow first start**: expected; enable Prebuilds to make later starts fast.
- **Playwright browsers missing after a rebuild**: rerun `npx playwright install --with-deps chromium`.
- **Sharp errors**: you are likely on an arm64 machine — switch the codespace to x64 Linux.
- **MCP server won't start**: check **MCP: List Servers → Show Output**; for `neon`, confirm `NEON_API_KEY`; for `github`, confirm `GITHUB_MCP_PAT` or rely on `GITHUB_TOKEN`.
