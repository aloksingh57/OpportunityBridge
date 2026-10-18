import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isDemoModeEnabled, isSupabaseAuthConfigured } from "@/lib/runtime-mode";

export function proxy(request: NextRequest) {
  const requestId = randomUUID();
  const path = request.nextUrl.pathname;
  const isHealthEndpoint = ["/api/health/live", "/api/health/ready"].includes(path);
  const isSupabaseAuthEndpoint = [
    "/api/auth/session",
    "/api/auth/sign-in",
    "/api/auth/sign-up",
    "/api/auth/sign-out",
  ].includes(path);
  const isConfiguredAuthRequest = isSupabaseAuthEndpoint && isSupabaseAuthConfigured();
  if (!isDemoModeEnabled() && !isHealthEndpoint && !isConfiguredAuthRequest) {
    return NextResponse.json(
      {
        error: "This deployment is not configured for production accounts or persistence.",
        code: "PRODUCTION_SERVICES_NOT_CONFIGURED",
        requestId,
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
      },
    );
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Request-ID", requestId);
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
