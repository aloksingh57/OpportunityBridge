import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppExperience } from "@/components/opportunity-bridge/app-experience";
import { getBootstrap } from "@/lib/bootstrap";
import { getActor } from "@/lib/auth";
import { isKnownRoute, isProtectedRoute } from "@/lib/routes";
import { isDemoModeEnabled, isSupabaseAuthConfigured } from "@/lib/runtime-mode";
import { SupabaseAuthPage } from "@/components/opportunity-bridge/supabase-auth-page";

export default function Page({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  return (
    <Suspense fallback={<main className="loading-page" role="status"><span className="loading-orbit" /><p>Getting OpportunityBridge ready…</p></main>}>
      <RouteContent params={params} />
    </Suspense>
  );
}

async function RouteContent({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await params;
  const path = `/${segments.join("/")}`;
  if (!isDemoModeEnabled() && (path === "/login" || path === "/register") && isSupabaseAuthConfigured()) {
    return <SupabaseAuthPage initialMode={path === "/login" ? "sign-in" : "sign-up"} />;
  }
  if (!isDemoModeEnabled()) {
    return (
      <main className="not-found-page" role="status">
        <p className="eyebrow">PRODUCTION SETUP REQUIRED</p>
        <h1>OpportunityBridge is not configured for production yet.</h1>
        <p>Real opportunity, messaging, application, and dashboard data are not available in this deployment. Supabase account sign-in is available only after its project settings and profile migration are configured.</p>
        {isSupabaseAuthConfigured() ? <p><Link className="button button-dark" href="/login">Sign in to your Supabase account</Link></p> : null}
        <p>Start the local development server to explore the clearly labeled demo.</p>
      </main>
    );
  }
  if (!isKnownRoute(path)) notFound();
  if (isProtectedRoute(path) && !(await getActor())) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  const initialData = await getBootstrap();
  return <AppExperience path={segments} initialData={initialData} />;
}
