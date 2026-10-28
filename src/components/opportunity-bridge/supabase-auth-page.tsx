"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Compass, LoaderCircle, ShieldCheck } from "lucide-react";
import type { Role } from "@/types/opportunity-bridge";

type AuthMode = "sign-in" | "sign-up";
type AuthProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  location: string;
};
type AuthPayload = {
  user?: AuthProfile | null;
  message?: string;
  error?: string;
  confirmationRequired?: boolean;
};

const roleLabels: Record<Role, string> = {
  student: "Student",
  "job-seeker": "Job seeker",
  founder: "Founder",
  investor: "Investor",
  mentor: "Mentor",
  advisor: "Advisor",
  recruiter: "Recruiter",
};

export function SupabaseAuthPage({ initialMode }: { initialMode: AuthMode }) {
  const mode = initialMode;
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as AuthPayload;
        if (!response.ok) throw new Error(payload.error ?? "Your sign-in status could not be checked.");
        if (active) setUser(payload.user ?? null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Your sign-in status could not be checked.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const body = mode === "sign-in"
      ? { email: form.get("email"), password: form.get("password") }
      : {
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          location: form.get("location"),
        };
    try {
      const response = await fetch(`/api/auth/${mode === "sign-in" ? "sign-in" : "sign-up"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json() as AuthPayload;
      if (!response.ok) throw new Error(payload.error ?? "The request could not be completed.");
      setUser(payload.user ?? null);
      setMessage(payload.message ?? "Your request was completed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/sign-out", { method: "POST" });
      const payload = await response.json() as AuthPayload;
      if (!response.ok) throw new Error(payload.error ?? "Sign-out failed.");
      setUser(null);
      setMessage(payload.message ?? "You are signed out.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-out failed.");
    } finally {
      setLoading(false);
    }
  }

  const heading = mode === "sign-in" ? "Welcome back." : "Create your account.";
  return (
    <div className="auth-page">
      <section className="auth-card" aria-labelledby="supabase-auth-title">
        <div className="auth-icon"><Compass size={22} /></div>
        <p className="eyebrow">OPPORTUNITYBRIDGE ACCOUNT</p>
        <h1 id="supabase-auth-title">{user ? "Your account is connected." : heading}</h1>
        <p>Secure sign-in is handled by the configured Supabase Auth project. Your password is sent only to that provider.</p>
        {error ? <p className="flash-message flash-error" role="alert">{error}</p> : null}
        {message ? <p className="flash-message flash-success" role="status" aria-live="polite">{message}</p> : null}
        {user ? (
          <div className="form-stack">
            <p><strong>{user.name}</strong><br />{user.email}<br />{roleLabels[user.role]} · {user.location}</p>
            <p className="auth-production-note">The authenticated profile is stored in Supabase. Opportunity, messaging, application, and dashboard data are still demo-only and are not enabled for production accounts.</p>
            <button className="button button-light full-width" type="button" onClick={() => void signOut()} disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
              Sign out
            </button>
          </div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            {mode === "sign-up" ? <>
              <label htmlFor="auth-name">Your name<input id="auth-name" name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
              <label htmlFor="auth-location">City or region<input id="auth-location" name="location" required minLength={2} maxLength={100} autoComplete="address-level2" /></label>
            </> : null}
            <label htmlFor="auth-email">Email<input id="auth-email" name="email" type="email" required maxLength={150} autoComplete="email" /></label>
            <label htmlFor="auth-password">Password<input id="auth-password" name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /></label>
            <button className="button button-dark full-width" type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={16} /> : <ArrowRight size={16} />}
              {mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>
        )}
        {!user ? (
          <p className="auth-switch">
            {mode === "sign-in" ? "New here? " : "Already have an account? "}
            <Link href={mode === "sign-in" ? "/register" : "/login"}>
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </Link>
          </p>
        ) : null}
        <p className="field-hint">New accounts start with the least-privileged Student role. Additional roles require a future verified onboarding flow.</p>
      </section>
      <aside className="auth-aside">
        <span className="eyebrow">PRODUCTION ACCOUNT PILOT</span>
        <h2>One secure step forward.</h2>
        <p>This integration creates authenticated profiles, but it does not yet move opportunity or community records out of the clearly labelled demo store.</p>
        <div className="auth-aside-points">
          <span><Check size={16} />Passwords remain with Supabase Auth</span>
          <span><Check size={16} />Profile rows are protected by row-level security</span>
          <span><Check size={16} />No service-role key is used by the application</span>
        </div>
        <Link className="auth-switch" href="/">View production readiness limits</Link>
      </aside>
    </div>
  );
}
