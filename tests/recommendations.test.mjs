import assert from "node:assert/strict";
import test from "node:test";
import { seedStore } from "../src/lib/demo-seed.ts";
import { canTransitionApplication, recommendOpportunities } from "../src/lib/recommendations.ts";

test("recommendations exclude ineligible listing states and explain each estimate", () => {
  const student = seedStore.users.find((user) => user.id === "student-aarav");
  assert.ok(student);
  const matches = recommendOpportunities(student, seedStore.opportunities, new Date());
  assert.ok(matches.length > 0);
  for (const match of matches) {
    assert.equal(match.opportunity.status, "published");
    assert.ok(new Date(match.opportunity.deadline) >= new Date());
    assert.ok(match.score >= 0 && match.score <= 100);
    assert.ok(match.reasons.length > 0);
  }
  assert.ok(matches.every((match) => match.opportunity.type !== "startup-funding"));
});

test("application transitions permit only defined next states", () => {
  assert.equal(canTransitionApplication("submitted", "reviewing"), true);
  assert.equal(canTransitionApplication("reviewing", "interview"), true);
  assert.equal(canTransitionApplication("submitted", "accepted"), false);
  assert.equal(canTransitionApplication("accepted", "reviewing"), false);
  assert.equal(canTransitionApplication("rejected", "withdrawn"), false);
});
