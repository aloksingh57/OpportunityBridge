import { timingSafeEqual } from "node:crypto";
import { adminUserId, createSessionValue, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const configuredKey = process.env.OPPORTUNITYBRIDGE_ADMIN_KEY;
  if (!configuredKey) {
    return Response.json({ error: "Admin demo access is disabled. Configure OPPORTUNITYBRIDGE_ADMIN_KEY on the server to enable it." }, { status: 403 });
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
