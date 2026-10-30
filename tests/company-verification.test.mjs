import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionVerification,
  isValidRegistrationIdentifier,
  latestVerificationRequest,
  normalizeRegistrationIdentifier,
  verificationStatus,
} from "../src/lib/company-verification.ts";
import { seedStore } from "../src/lib/demo-seed.ts";

test("registration identifier checks are type-specific and never imply verification", () => {
  assert.equal(isValidRegistrationIdentifier("cin", "U12345KA2020PTC123456"), true);
  assert.equal(isValidRegistrationIdentifier("llpin", "AAB-1234"), true);
  assert.equal(isValidRegistrationIdentifier("gstin", "27AAPFU0939F1ZV"), true);
  assert.equal(isValidRegistrationIdentifier("dpiit", "DIPP-12345"), true);
  assert.equal(isValidRegistrationIdentifier("cin", "DIPP-12345"), false);
  assert.equal(isValidRegistrationIdentifier("gstin", "not-a-gstin"), false);
  assert.equal(normalizeRegistrationIdentifier("  aab - 1234 "), "AAB-1234");
});

test("verification status derives from the latest submitted request", () => {
  const requests = [
    { id: "older", organizationId: "org-1", submittedAt: "2026-01-01T00:00:00.000Z", status: "rejected" },
    { id: "newer", organizationId: "org-1", submittedAt: "2026-02-01T00:00:00.000Z", status: "pending-verification" },
  ];
  assert.equal(latestVerificationRequest(requests, "org-1")?.id, "newer");
  assert.equal(verificationStatus(requests, "org-1"), "pending-verification");
  assert.equal(verificationStatus(requests, "org-2"), "not-submitted");
});

test("verification transitions require pending manual review or explicit expiry", () => {
  for (const status of ["verified", "rejected", "additional-information-required", "expired"]) {
    assert.equal(canTransitionVerification("pending-verification", status), true);
  }
  assert.equal(canTransitionVerification("verified", "expired"), true);
  assert.equal(canTransitionVerification("verified", "rejected"), false);
  assert.equal(canTransitionVerification("rejected", "verified"), false);
  assert.equal(canTransitionVerification("not-submitted", "verified"), false);
});

test("seeded organizations stay explicitly unverified until an admin reviews a request", () => {
  assert.ok(seedStore.users.find((user) => user.id === "recruiter-sara")?.roles.includes("existing-company"));
  assert.ok(seedStore.organizations.every((organization) =>
    verificationStatus(seedStore.companyVerificationRequests, organization.id) === "not-submitted",
  ));
});
