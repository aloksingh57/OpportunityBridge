import { createSessionValue, getActor, setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { SessionSchema } from "@/lib/validation";
import { toPublicUser } from "@/lib/bootstrap";

export async function GET(request: Request) {
  const actor = await getActor(request.headers.get("cookie") ?? "");
  if (!actor) return Response.json({ user: null });
  const user = (await readStore()).users.find((item) => item.id === actor.id);
  return Response.json({
    user: user ? toPublicUser(user) : null,
    isAdmin: actor.isAdmin,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = SessionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Choose a valid demo profile." }, { status: 400 });
  const user = (await readStore()).users.find((item) => item.id === parsed.data.demoUserId && item.status === "active");
  if (!user) return Response.json({ error: "That demo profile is unavailable." }, { status: 404 });
  await setSessionCookie(createSessionValue(user.id));
  return Response.json({ user: toPublicUser(user), isAdmin: false });
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ message: "Signed out of the demo profile." });
}
