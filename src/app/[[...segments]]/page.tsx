import { notFound, redirect } from "next/navigation";
import { AppExperience } from "@/components/opportunity-bridge/app-experience";
import { getBootstrap } from "@/lib/bootstrap";
import { getActor } from "@/lib/auth";
import { isKnownRoute, isProtectedRoute } from "@/lib/routes";

export default async function Page({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await params;
  const path = `/${segments.join("/")}`;
  if (!isKnownRoute(path)) notFound();
  if (isProtectedRoute(path) && !(await getActor())) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  const initialData = await getBootstrap();
  return <AppExperience path={segments} initialData={initialData} />;
}
