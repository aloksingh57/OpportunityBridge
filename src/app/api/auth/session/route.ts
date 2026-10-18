import {
  createSupabaseServerClient,
  isMissingSupabaseSession,
  readSupabaseProfile,
} from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/runtime-mode";

export async function GET() {
  if (!isSupabaseAuthConfigured()) {
    return Response.json(
      { error: "Supabase Auth is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isMissingSupabaseSession(error)) {
        return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
      }
      console.error("Supabase session verification failed.", { code: error.code, status: error.status });
      return Response.json({ error: "The sign-in session could not be verified." }, { status: 503 });
    }
    if (!data.user) return Response.json({ user: null }, { headers: { "Cache-Control": "no-store" } });

    const profile = await readSupabaseProfile(supabase, data.user.id);
    return Response.json({
      user: { ...profile, email: data.user.email ?? "" },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Supabase session service is unavailable.", error);
    return Response.json({ error: "The sign-in session could not be loaded." }, { status: 503 });
  }
}
