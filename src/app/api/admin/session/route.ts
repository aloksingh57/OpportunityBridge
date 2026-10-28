import { timingSafeEqual } from "node:crypto";
import { adminUserId, createSessionValue, setSessionCookie } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const configuredKey = process.env.OPPORTUNITYBRIDGE_ADMIN_KEY;
  if (!configuredKey) {
    return Response.json({ error: "Admin demo access is disabled. Configure OPPORTUNITYBRIDGE_ADMIN_KEY on the server to enable it." }, { status: 403 });
  }
  const limit = consumeRateLimit("admin-session-attempts", 12, 15 * 60_000);
  if (!limit.allowed) {
    return Response.json(
      { error: "Too many admin sign-in attempts. Please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("key" in body) || typeof body.key !== "string") {
    return Response.json({ error: "Enter the server-configured admin demo key." }, { status: 400 });
  }
  const provided = Buffer.from(body.key);
  const expected = Buffer.from(configuredKey);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return Response.json({ error: "That admin key is not valid." }, { status: 401 });
  }
  await setSessionCookie(createSessionValue(adminUserId));
  return Response.json({ message: "Admin demo session started." });
}
