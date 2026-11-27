type D1Result<T> = { results?: T[]; success?: boolean };

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1DatabaseLike = {
  prepare(query: string): D1Statement;
};

let cachedDatabase: D1DatabaseLike | null | undefined;

export function isD1DatabaseConfigured() {
  return process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "d1";
}

export async function getD1Database(): Promise<D1DatabaseLike> {
  if (cachedDatabase !== undefined) {
    if (!cachedDatabase) throw new Error("D1 database binding RADAR_DB is not available");
    return cachedDatabase;
  }

  try {
    const cloudflare = await import("cloudflare:workers") as { env?: Record<string, unknown> };
    const candidate = cloudflare.env?.RADAR_DB;
    cachedDatabase = candidate && typeof candidate === "object" && "prepare" in candidate
      ? candidate as D1DatabaseLike
      : null;
  } catch {
    cachedDatabase = null;
  }

  if (!cachedDatabase) throw new Error("D1 database binding RADAR_DB is not available");
  return cachedDatabase;
}

export function resetD1DatabaseForTests() {
  cachedDatabase = undefined;
}

export async function d1First<T>(query: string, ...values: unknown[]) {
  return (await getD1Database()).prepare(query).bind(...values).first<T>();
}

export async function d1All<T>(query: string, ...values: unknown[]) {
  const result = await (await getD1Database()).prepare(query).bind(...values).all<T>();
  return result.results || [];
}

export async function d1Run(query: string, ...values: unknown[]) {
  await (await getD1Database()).prepare(query).bind(...values).run();
}
