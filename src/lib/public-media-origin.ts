const STATIC_PUBLIC_IMAGE_ORIGINS = [
  "https://images.unsplash.com",
  "https://cdn.radarcharts.net",
  "https://remradar.wordpress.com",
  "https://i0.wp.com",
  "https://pub-2d7f41f7140544c480801d8b90da765e.r2.dev",
] as const;

export function normalizePublicMediaOrigin(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("R2_PUBLIC_BASE_URL must be a valid HTTPS URL");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "" && parsed.pathname !== "/")
  ) {
    throw new Error(
      "R2_PUBLIC_BASE_URL must be an HTTPS origin without credentials, path, query, or fragment",
    );
  }

  return parsed.origin;
}

export function publicImageOrigins(r2PublicBaseUrl?: string): string[] {
  const r2Origin = normalizePublicMediaOrigin(r2PublicBaseUrl);
  return [...new Set([...STATIC_PUBLIC_IMAGE_ORIGINS, ...(r2Origin ? [r2Origin] : [])])];
}

export function publicImageRemotePattern(origin: string) {
  const parsed = new URL(origin);
  return {
    protocol: parsed.protocol.replace(":", "") as "http" | "https",
    hostname: parsed.hostname,
    ...(parsed.port ? { port: parsed.port } : {}),
  };
}

export const staticPublicImageOrigins = [...STATIC_PUBLIC_IMAGE_ORIGINS];
