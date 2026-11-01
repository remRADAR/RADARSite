#!/usr/bin/env bash
# GitHub MCP server wrapper (official image: ghcr.io/github/github-mcp-server).
# Auth order:
#   1. GITHUB_MCP_PAT - a fine-grained personal access token stored as a
#      Codespaces secret (recommended; scope it to remRADAR/RADARSite).
#   2. GITHUB_TOKEN   - auto-injected by Codespaces; limited scopes, but
#      usually enough for read access plus basic operations on this repo.
set -euo pipefail

PAT="${GITHUB_MCP_PAT:-${GITHUB_TOKEN:-}}"
if [ -z "$PAT" ]; then
  echo "github-mcp: set the GITHUB_MCP_PAT Codespaces secret (or GITHUB_TOKEN)." >&2
  exit 1
fi

exec docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN="$PAT" \
  ghcr.io/github/github-mcp-server
