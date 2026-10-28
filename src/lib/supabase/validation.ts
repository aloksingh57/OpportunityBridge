import { z } from "zod";

const normalizedEmail = z.string().trim().toLowerCase().pipe(z.email().max(150));

export const SupabaseSignInSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8).max(128),
});

export const SupabaseSignUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: normalizedEmail,
  password: z.string().min(8).max(128),
  location: z.string().trim().min(2).max(100),
});
