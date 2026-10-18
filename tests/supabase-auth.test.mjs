import assert from "node:assert/strict";
import test from "node:test";
import { SupabaseSignInSchema, SupabaseSignUpSchema } from "../src/lib/supabase/validation.ts";

test("Supabase sign-in normalizes email and rejects weak or malformed credentials", () => {
  assert.deepEqual(SupabaseSignInSchema.parse({ email: "  FARMER@example.com ", password: "valid-password" }), {
    email: "farmer@example.com",
    password: "valid-password",
  });
  assert.equal(SupabaseSignInSchema.safeParse({ email: "not-an-email", password: "valid-password" }).success, false);
  assert.equal(SupabaseSignInSchema.safeParse({ email: "farmer@example.com", password: "short" }).success, false);
});

test("Supabase registration validates bounded profile fields and does not accept user-selected roles", () => {
  const parsed = SupabaseSignUpSchema.parse({
    name: "  A farmer  ",
    email: "  FARMER@example.com ",
    password: "valid-password",
    location: "  Pune  ",
    role: "admin",
  });
  assert.deepEqual(parsed, {
    name: "A farmer",
    email: "farmer@example.com",
    password: "valid-password",
    location: "Pune",
  });
  assert.equal(SupabaseSignUpSchema.safeParse({
    name: "A farmer",
    email: "farmer@example.com",
    password: "valid-password",
    location: " ",
  }).success, false);
});
