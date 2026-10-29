#!/usr/bin/env bash
# RADARSite — Codespaces post-create setup.
# Runs automatically after the dev container is created (first build or rebuild).
set -euo pipefail

echo "==> Installing npm dependencies"
npm install

echo "==> Installing Playwright Chromium + system dependencies"
npx playwright install --with-deps chromium

echo "==> Pre-pulling the GitHub MCP server image (used by the 'github' MCP server)"
docker pull ghcr.io/github/github-mcp-server:latest >/dev/null 2>&1 \
  || echo "    (skipped - Docker unavailable; the image will be pulled on first MCP use)"

echo "==> Creating .env.local from the example template + Codespaces secrets"
node --input-type=module -e '
import fs from "node:fs";
if (!fs.existsSync(".env.local") && fs.existsSync(".env.local.example")) {
  fs.copyFileSync(".env.local.example", ".env.local");
}
if (fs.existsSync(".env.local")) {
  let text = fs.readFileSync(".env.local", "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, current] = match;
    const injected = process.env[key];
    if (injected && !current.trim()) {
      // Function replacer: never interprets "$" sequences in secret values.
      text = text.replace(line, () => `${key}=${injected}`);
    }
  }
  fs.writeFileSync(".env.local", text);
}
'
echo "    .env.local is gitignored - secrets never leave the container."

echo "==> Toolchain"
echo "    node $(node --version)"
echo "    npm  $(npm --version)"
echo "    gh   $(gh --version | head -n1)"

echo "Done. Start the dev server with: npm run dev"
