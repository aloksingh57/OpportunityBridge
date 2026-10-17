const exactRoutes = new Set([
  "/",
  "/about",
  "/opportunities",
  "/people",
  "/login",
  "/register",
  "/forgot-password",
  "/how-it-works",
  "/contact",
  "/onboarding",
  "/dashboard",
  "/profile",
  "/settings",
  "/notifications",
  "/messages",
  "/connections",
  "/saved",
  "/applications",
  "/publish",
  "/manage-opportunities",
  "/manage-applicants",
  "/recommendations",
  "/admin",
  "/admin/users",
  "/admin/opportunities",
]);

export function isKnownRoute(path: string): boolean {
  return exactRoutes.has(path)
    || /^\/opportunities\/[^/]+$/.test(path)
    || /^\/people\/[^/]+$/.test(path)
    || /^\/applications\/[^/]+$/.test(path);
}

export function isProtectedRoute(path: string): boolean {
  return [
    "/onboarding",
    "/dashboard",
    "/profile",
    "/settings",
    "/notifications",
    "/messages",
    "/connections",
    "/saved",
    "/applications",
    "/publish",
    "/manage-opportunities",
    "/manage-applicants",
    "/recommendations",
  ].some((route) => path === route || path.startsWith(`${route}/`));
}
