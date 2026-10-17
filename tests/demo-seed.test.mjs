import assert from "node:assert/strict";
import test from "node:test";
import { seedStore } from "../src/lib/demo-seed.ts";

test("the demo seed contains enough linked people, listings, and varied applications", () => {
  assert.ok(seedStore.users.length >= 18);
  assert.ok(seedStore.opportunities.length >= 24);
  assert.ok(seedStore.applications.length >= 20);
  assert.ok(new Set(seedStore.applications.map((application) => application.status)).size >= 5);

  const userIds = new Set(seedStore.users.map((user) => user.id));
  const opportunityIds = new Set(seedStore.opportunities.map((opportunity) => opportunity.id));
  for (const application of seedStore.applications) {
    assert.ok(userIds.has(application.applicantId), `missing applicant ${application.applicantId}`);
    assert.ok(opportunityIds.has(application.opportunityId), `missing opportunity ${application.opportunityId}`);
  }
});

test("every demo message belongs to a conversation participant", () => {
  const conversations = new Map(seedStore.conversations.map((conversation) => [conversation.id, conversation]));
  for (const message of seedStore.messages) {
    const conversation = conversations.get(message.conversationId);
    assert.ok(conversation);
    assert.ok(conversation.participantIds.includes(message.senderId));
  }
});

test("demo identities support multiple roles and every startup points to a founder", () => {
  assert.ok(seedStore.users.some((user) => user.roles.length > 1));
  const usersById = new Map(seedStore.users.map((user) => [user.id, user]));
  assert.ok(seedStore.startups.length >= 3);
  for (const startup of seedStore.startups) {
    const founder = usersById.get(startup.founderId);
    assert.ok(founder);
    assert.ok(founder.roles.includes("founder"));
    assert.equal(startup.isDemo, true);
  }
});
