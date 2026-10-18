import {
  createSupabaseServerClient,
  isSameOriginRequest,
} from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-origin sign-out is not allowed." }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      console.error("Supabase sign-out failed.", { code: error.code, status: error.status });
      return Response.json({ error: "Sign-out is temporarily unavailable. Please try again." }, { status: 503 });
    }
    return Response.json({ message: "You are signed out." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supabase sign-out service is unavailable.", error);
    return Response.json({ error: "Sign-out is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
