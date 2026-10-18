import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicKey } from "@/lib/runtime-mode";
import { z } from "zod";
import { roles } from "@/types/opportunity-bridge";

const SupabaseProfileSchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(80),
  role: z.enum(roles),
  location: z.string().max(100),
  skills: z.array(z.string().max(50)).max(30),
});

export type SupabaseProfile = z.infer<typeof SupabaseProfileSchema>;

export async function createSupabaseServerClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = getSupabasePublicKey();
  if (!url || !key) throw new Error("Supabase Auth is not configured.");

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function readSupabaseProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<SupabaseProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, location, skills")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("The Supabase profile record could not be loaded.");
  const parsed = SupabaseProfileSchema.safeParse(data);
  if (!parsed.success) throw new Error("The Supabase profile is missing or invalid; apply the checked-in profile migration.");
  return parsed.data;
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function isMissingSupabaseSession(error: { name?: string; code?: string }): boolean {
  return error.name === "AuthSessionMissingError" || error.code === "session_not_found";
}
