import { createSessionValue, setSessionCookie } from "@/lib/auth";
import { newId, updateStore } from "@/lib/store";
import { RegisterSchema } from "@/lib/validation";
import type { UserProfile } from "@/types/opportunity-bridge";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check your name, email, role, location, and skills.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const user = await updateStore((store) => {
      const normalizedEmail = parsed.data.email.toLowerCase();
      if (store.users.some((record) => record.email.toLowerCase() === normalizedEmail)) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
      }
      const profile: UserProfile = {
        id: newId("member"),
        name: parsed.data.name,
        email: normalizedEmail,
        role: parsed.data.role,
        headline: `${parsed.data.role.replace("-", " ")} · new to OpportunityBridge`,
        bio: "A new member exploring opportunities and connections in this local product demo.",
        location: parsed.data.location,
        avatar: parsed.data.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        skills: parsed.data.skills,
        interests: [],
        experienceLevel: parsed.data.role === "student" ? "student" : "entry",
        remotePreference: "any",
        isDemo: true,
        status: "active",
      };
      store.users.push(profile);
      return profile;
    });
    await setSessionCookie(createSessionValue(user.id));
    return Response.json({ user: { id: user.id, name: user.name, role: user.role } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_REGISTERED") {
      return Response.json({ error: "This demo email is already in use. Try a different address or choose a demo profile." }, { status: 409 });
    }
    console.error("Could not create the local demo profile.", error);
    return Response.json({ error: "Your profile could not be saved. Please try again." }, { status: 500 });
  }
}
