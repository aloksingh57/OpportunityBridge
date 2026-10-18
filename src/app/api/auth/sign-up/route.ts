import { SupabaseSignUpSchema } from "@/lib/supabase/validation";
import {
  createSupabaseServerClient,
  isSameOriginRequest,
  readSupabaseProfile,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-origin account creation is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = SupabaseSignUpSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Check your name, email, password, and location." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { name: parsed.data.name, location: parsed.data.location } },
    });
    if (error) {
      console.warn("Supabase account creation was rejected.", { code: error.code, status: error.status });
      return Response.json(
        { error: "Account creation could not be completed. Check your details or try again later." },
        { status: error.status === 429 ? 429 : 400 },
      );
    }
    if (!data.user) {
      return Response.json({ error: "The sign-up provider did not return an account." }, { status: 503 });
    }
    if (!data.session) {
      return Response.json({
        user: null,
        confirmationRequired: true,
        message: "If this address can register, check its inbox for the confirmation link.",
      }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    const profile = await readSupabaseProfile(supabase, data.user.id);
    return Response.json({
      user: { ...profile, email: data.user.email ?? "" },
      confirmationRequired: false,
      message: "Your account is ready. Opportunity and community workflows remain in demo-only mode.",
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Supabase account-creation service is unavailable.", error);
    return Response.json({ error: "Account creation is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
