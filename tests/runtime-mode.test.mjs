import assert from "node:assert/strict";
import test from "node:test";
import {
  getReadinessReport,
  getSupabasePublicKey,
  isDemoModeEnabled,
  isSupabaseAuthConfigured,
} from "../src/lib/runtime-mode.ts";

const publishableKey = "sb_publishable_test_key_with_a_long_enough_suffix";

test("demo access is automatic only outside production", () => {
  assert.equal(isDemoModeEnabled({ NODE_ENV: "development" }), true);
  assert.equal(isDemoModeEnabled({ NODE_ENV: "test" }), true);
  assert.equal(isDemoModeEnabled({ NODE_ENV: "production" }), false);
  assert.equal(isDemoModeEnabled({ NODE_ENV: "production", OPPORTUNITYBRIDGE_ENABLE_DEMO: "true" }), true);
});

test("production readiness reports that demo mode is not production-ready", () => {
  const blocked = getReadinessReport({ NODE_ENV: "production" });
  assert.equal(blocked.status, "not-ready");
  assert.equal(blocked.productionReady, false);
  assert.ok(blocked.blockers.length > 0);

  const demo = getReadinessReport({ NODE_ENV: "production", OPPORTUNITYBRIDGE_ENABLE_DEMO: "true" });
  assert.equal(demo.status, "ready");
  assert.equal(demo.mode, "demo");
  assert.equal(demo.productionReady, false);
});

test("production Supabase auth requires a valid HTTPS project URL and public key", () => {
  assert.equal(isSupabaseAuthConfigured({
    NODE_ENV: "production",
    SUPABASE_URL: "https://project-ref.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
  }), true);
  assert.equal(isSupabaseAuthConfigured({
    NODE_ENV: "production",
    SUPABASE_URL: "http://project-ref.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
  }), false);
  assert.equal(isSupabaseAuthConfigured({
    NODE_ENV: "production",
    SUPABASE_URL: "https://project-ref.supabase.co",
    SUPABASE_ANON_KEY: "service-role-key",
  }), false);
});

test("Supabase configuration accepts loopback HTTP only outside production", () => {
  const local = {
    NODE_ENV: "development",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
  };
  assert.equal(isSupabaseAuthConfigured(local), true);
  assert.equal(isSupabaseAuthConfigured({ ...local, NODE_ENV: "production" }), false);
});

test("legacy JWT keys are accepted only when their role claim is anon", () => {
  const tokenForRole = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
  assert.equal(getSupabasePublicKey({ SUPABASE_ANON_KEY: tokenForRole("anon") }), tokenForRole("anon"));
  assert.equal(getSupabasePublicKey({ SUPABASE_ANON_KEY: tokenForRole("service_role") }), null);
});
