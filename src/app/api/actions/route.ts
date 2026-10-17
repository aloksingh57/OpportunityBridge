import { ActionError, runAction } from "@/lib/actions";
import { requireActor } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { ActionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Check the submitted fields.", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const actor = await requireActor();
    const limit = consumeRateLimit(`actions:${actor.id}`, 120, 60_000);
    if (!limit.allowed) {
      return Response.json(
        { error: "Too many actions. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    const result = await runAction(actor, parsed.data);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ActionError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Choose a demo profile to continue." }, { status: 401 });
    if (error instanceof Error && error.message === "ROLE_FORBIDDEN") return Response.json({ error: "This action is not available for your demo role." }, { status: 403 });
    console.error("OpportunityBridge action failed.", error);
    return Response.json({ error: "That change could not be saved. Please try again." }, { status: 500 });
  }
}
