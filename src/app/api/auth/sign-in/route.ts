import { SupabaseSignInSchema } from "@/lib/supabase/validation";
import {
  createSupabaseServerClient,
  isSameOriginRequest,
  readSupabaseProfile,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-origin sign-in is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = SupabaseSignInSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      console.warn("Supabase sign-in was rejected.", { code: error.code, status: error.status });
      return Response.json(
        { error: error.status === 429 ? "Too many sign-in attempts. Please wait and try again." : "Email or password not recognized." },
        { status: error.status === 429 ? 429 : 401 },
      );
    }
    if (!data.user) {
      return Response.json({ error: "The sign-in provider did not return an account." }, { status: 503 });
    }

    const profile = await readSupabaseProfile(supabase, data.user.id);
    return Response.json({
      user: { ...profile, email: data.user.email ?? "" },
      message: "You are signed in. Opportunity and community workflows remain in demo-only mode.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Supabase sign-in service is unavailable.", error);
    return Response.json({ error: "Sign-in is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
