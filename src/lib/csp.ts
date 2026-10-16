const SCRIPT_ORIGINS = ["https://va.vercel-scripts.com", "https://www.googletagmanager.com"];

export function buildScriptSrcDirective(environment: string | undefined = process.env.NODE_ENV) {
  return [
    "'self'",
    "'unsafe-inline'",
    ...(environment === "development" ? ["'unsafe-eval'"] : []),
    ...SCRIPT_ORIGINS,
  ].join(" ");
}
