import { NextRequest, NextResponse } from "next/server";
import { isSameOriginMutation, rateLimit } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32 * 1024;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type BriefPayload = {
  title?: unknown;
  projectType?: unknown;
  budgetRange?: unknown;
  timeline?: unknown;
  details?: unknown;
  website?: unknown;
};

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

function configuredEmail(name: string) {
  const value = process.env[name]?.trim() || "";
  return value.includes("@") && !/[\r\n]/.test(value) ? value : "";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const limit = rateLimit(request, "contact-email", 5);
  if (!limit.allowed) {
    return json({ error: "Too many submissions. Try again later." }, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return json({ error: "Submission is too large" }, { status: 413 });
  }

  const body = await request.json().catch(() => null) as BriefPayload | null;
  if (!body || typeof body !== "object") {
    return json({ error: "A valid JSON submission is required" }, { status: 400 });
  }

  // Quietly accept the honeypot field so simple bots receive no useful signal.
  if (text(body.website, 120)) return json({ ok: true });

  const brief = {
    title: text(body.title, 160),
    projectType: text(body.projectType, 100),
    budgetRange: text(body.budgetRange, 100),
    timeline: text(body.timeline, 100),
    details: text(body.details, 5000),
  };

  if (!brief.title || !brief.projectType || !brief.budgetRange || !brief.timeline || !brief.details) {
    return json({ error: "Please complete every brief field before submitting." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = configuredEmail("RESEND_FROM_EMAIL");
  const to = configuredEmail("RESEND_TO_EMAIL");
  if (!apiKey || !from || !to) {
    return json({ error: "Email delivery is not configured" }, { status: 503 });
  }

  const subject = `New RADAR brief: ${brief.title}`;
  const rows = [
    ["Project title", brief.title],
    ["Project type", brief.projectType],
    ["Budget range", brief.budgetRange],
    ["Timeline", brief.timeline],
    ["Details", brief.details],
  ];
  const html = `<h1>New RADAR project brief</h1>${rows.map(([label, value]) => `<p><strong>${escapeHtml(label)}</strong><br />${escapeHtml(value).replace(/\n/g, "<br />")}</p>`).join("")}`;
  const plainText = `New RADAR project brief\n\n${rows.map(([label, value]) => `${label}:\n${value}`).join("\n\n")}`;

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text: plainText }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Resend rejected RADAR brief", response.status);
      return json({ error: "Unable to deliver your brief right now" }, { status: 502 });
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Resend request failed", error);
    return json({ error: "Unable to deliver your brief right now" }, { status: 502 });
  }
}
