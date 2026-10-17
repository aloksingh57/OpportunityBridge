import { requireActor } from "@/lib/auth";
import { newId, updateStore } from "@/lib/store";
import { CreateOpportunitySchema } from "@/lib/validation";
import type { Opportunity, OpportunityType, UserProfile } from "@/types/opportunity-bridge";

function roleCanPublish(user: UserProfile, type: OpportunityType): boolean {
  return user.roles.includes("founder")
    || user.roles.includes("recruiter")
    || (user.roles.includes("mentor") && type === "mentorship")
    || (user.roles.includes("advisor") && type === "advisory");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = CreateOpportunitySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the opportunity details.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const actor = await requireActor();
    const opportunity = await updateStore((store) => {
      const publisher = store.users.find((user) => user.id === actor.id && user.status === "active");
      if (!publisher || !roleCanPublish(publisher, parsed.data.type)) {
        throw new Error("PUBLISH_ROLE_FORBIDDEN");
      }
      if (new Date(parsed.data.deadline) <= new Date()) throw new Error("DEADLINE_INVALID");
      if (parsed.data.compensationMin !== null && parsed.data.compensationMax !== null
        && parsed.data.compensationMax < parsed.data.compensationMin) {
        throw new Error("COMPENSATION_INVALID");
      }
      const record: Opportunity = {
        ...parsed.data,
        id: newId("opportunity"),
        publisherId: publisher.id,
        organization: `${publisher.name}'s demo team (fictional)`,
        responsibilities: ["Collaborate with the publisher and a small, supportive team.", "Share progress and complete the agreed project."],
        eligibility: ["Relevant experience or learning interest.", "Demo opportunity — confirm terms directly before making real commitments."],
        experienceLevel: publisher.roles.some((role) => role === "founder" || role === "recruiter") ? "entry" : "mid",
        status: "published",
        createdAt: new Date().toISOString(),
        isDemo: true,
      };
      store.opportunities.unshift(record);
      return record;
    });
    return Response.json({ opportunity }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Choose a demo profile to publish an opportunity." }, { status: 401 });
    if (error instanceof Error && error.message === "ROLE_FORBIDDEN") return Response.json({ error: "Your current demo profile cannot publish opportunities." }, { status: 403 });
    if (error instanceof Error && error.message === "PUBLISH_ROLE_FORBIDDEN") return Response.json({ error: "Only founders, recruiters, and matching mentor/advisor profiles can publish this opportunity type." }, { status: 403 });
    if (error instanceof Error && error.message === "DEADLINE_INVALID") return Response.json({ error: "Choose an application deadline in the future." }, { status: 400 });
    if (error instanceof Error && error.message === "COMPENSATION_INVALID") return Response.json({ error: "Maximum compensation must be at least the minimum." }, { status: 400 });
    console.error("Could not publish the opportunity.", error);
    return Response.json({ error: "The opportunity could not be saved. Please try again." }, { status: 500 });
  }
}
