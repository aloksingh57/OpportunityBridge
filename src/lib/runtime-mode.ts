type RuntimeEnvironment = {
NODE_ENV?: string;
OPPORTUNITYBRIDGE_ENABLE_DEMO?: string;
SUPABASE_URL?: string;
SUPABASE_ANON_KEY?: string;
SUPABASE_PUBLISHABLE_KEY?: string;
};

export function getSupabasePublicKey(environment: RuntimeEnvironment = process.env): string | null {
  const key = environment.SUPABASE_PUBLISHABLE_KEY?.trim() || environment.SUPABASE_ANON_KEY?.trim();
  if (!key || /example|your[-_ ]?key|replace|placeholder|changeme/i.test(key)) return null;
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return key;
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { role?: unknown };
    return claims.role === "anon" ? key : null;
  } catch {
    return null;
  }
}

export function isSupabaseAuthConfigured(environment: RuntimeEnvironment = process.env): boolean {
  const configuredUrl = environment.SUPABASE_URL?.trim();
  const publicKey = getSupabasePublicKey(environment);
  if (!configuredUrl || !publicKey) return false;
  try {
    const url = new URL(configuredUrl);
    const secureProductionUrl = url.protocol === "https:"
      && url.pathname === "/"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
    const localDevelopmentUrl = environment.NODE_ENV !== "production"
      && url.protocol === "http:"
      && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    return secureProductionUrl || localDevelopmentUrl;
  } catch {
    return false;
  }
}

function productionBlockers(environment: RuntimeEnvironment) {
  return [
    ...(isSupabaseAuthConfigured(environment)
      ? []
      : ["Supabase Auth requires a valid project URL and public anon/publishable key."]),
    "Supabase profile authentication is only a first slice; opportunity and community data still use the local demo store.",
    "A normalized production data adapter, complete workflow schema, transactional migrations, and migration tests are not implemented.",
    "Shared production rate limiting and operational monitoring are not configured.",
    "Private object storage, malware scanning, and retention automation are not configured.",
    "Password recovery, verified role assignment, and end-to-end production authorization tests are not implemented.",
  ];
}

export function isDemoModeEnabled(environment: RuntimeEnvironment = process.env): boolean {
  return environment.NODE_ENV !== "production" || environment.OPPORTUNITYBRIDGE_ENABLE_DEMO === "true";
}

export function getReadinessReport(environment: RuntimeEnvironment = process.env) {
  const demoMode = isDemoModeEnabled(environment);
  return {
    status: demoMode ? "ready" : "not-ready",
    mode: demoMode ? "demo" : "production",
    productionReady: false,
    supabaseAuthConfigured: isSupabaseAuthConfigured(environment),
    blockers: productionBlockers(environment),
  } as const;
}

export function demoModeRequiredResponse(): Response | null {
  if (isDemoModeEnabled()) return null;
  return Response.json(
    {
      error: "This deployment is not configured for production accounts or persistence.",
      code: "PRODUCTION_SERVICES_NOT_CONFIGURED",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
