import { isIP } from "node:net";
import type { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_ENTRIES = 10_000;
const TRUSTED_PROXY_HOPS = Math.max(0, Number.parseInt(process.env.RADAR_TRUSTED_PROXY_HOPS || "0", 10) || 0);

function validAddress(value: string | null) {
  const address = value?.trim() || "";
  return address && isIP(address) ? address : "";
}

export function getClientAddress(request: NextRequest) {
  // Forwarded headers are attacker-controlled unless the deployment explicitly
  // declares how many reverse proxies it owns. Walk from the proxy edge toward
  // the client instead of trusting the first X-Forwarded-For value.
  if (TRUSTED_PROXY_HOPS > 0) {
    const chain = (request.headers.get("x-forwarded-for") || "")
      .split(",")
      .map((value) => validAddress(value))
      .filter(Boolean);
    if (chain.length) return chain[Math.max(0, chain.length - TRUSTED_PROXY_HOPS - 1)];
    const realIp = validAddress(request.headers.get("x-real-ip"));
    if (realIp) return realIp;
  }
  return "unknown";
}

export function rateLimit(request: NextRequest, scope: string, limit = 100) {
  const now = Date.now();
  const key = `${scope}:${getClientAddress(request)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_ENTRIES) {
      for (const [entryKey, entry] of buckets) if (entry.resetAt <= now) buckets.delete(entryKey);
    }
    const next = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, next);
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), retryAfter: Math.ceil((current.resetAt - now) / 1000) };
}

export function isSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
