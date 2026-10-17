import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { readStore } from "@/lib/store";
import type { ActorRole, Role, UserProfile } from "@/types/opportunity-bridge";

export const sessionCookieName = "ob_demo_session";
export const adminUserId = "__opportunitybridge_admin__";

export interface Actor {
  id: string;
  role: ActorRole;
  isAdmin: boolean;
}

function signingSecret(): string {
  const configuredSecret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !configuredSecret) {
    throw new Error("AUTH_SECRET must be configured before running the production server.");
  }
  return configuredSecret || "local-demo-only-secret-not-for-deployment";
}

function sign(userId: string): string {
  return createHmac("sha256", signingSecret()).update(userId).digest("hex");
}

export function createSessionValue(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function verifySession(value: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const userId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(userId);
  const providedBytes = Buffer.from(signature, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return null;
  return userId;
}

export async function getActor(cookieHeader?: string): Promise<Actor | null> {
  const session = cookieHeader === undefined
    ? (await cookies()).get(sessionCookieName)?.value
    : cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`))?.slice(sessionCookieName.length + 1);
  if (!session) return null;
  const userId = verifySession(session);
  if (!userId) return null;
  if (userId === adminUserId) {
    return process.env.OPPORTUNITYBRIDGE_ADMIN_KEY ? { id: userId, role: "admin", isAdmin: true } : null;
  }
  const store = await readStore();
  const user = store.users.find((record) => record.id === userId && record.status === "active");
  return user ? { id: user.id, role: user.role, isAdmin: false } : null;
}

export async function findUser(userId: string): Promise<UserProfile | null> {
  const store = await readStore();
  return store.users.find((user) => user.id === userId) ?? null;
}

export async function requireActor(roles?: readonly Role[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new Error("AUTH_REQUIRED");
  if (actor.isAdmin) return actor;
  if (roles && !roles.includes(actor.role as Role)) throw new Error("ROLE_FORBIDDEN");
  return actor;
}

export function setSessionCookie(value: string): Promise<void> {
  return cookies().then((jar) => {
    jar.set(sessionCookieName, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(sessionCookieName);
}
