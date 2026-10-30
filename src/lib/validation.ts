import { z } from "zod";
import { isValidRegistrationIdentifier } from "@/lib/company-verification";
import { roles } from "@/types/opportunity-bridge";

const opportunityTypes = [
  "internship",
  "full-time",
  "part-time",
  "freelance",
  "student-project",
  "scholarship",
  "hackathon",
  "startup-funding",
  "mentorship",
  "advisory",
] as const;
const applicationStatuses = ["submitted", "reviewing", "shortlisted", "interview", "accepted", "rejected", "withdrawn"] as const;
const opportunityStatuses = ["draft", "published", "paused", "closed", "rejected"] as const;
const connectionStatuses = ["pending", "accepted", "declined", "cancelled"] as const;

const timestampSchema = z.iso.datetime();
const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(roles),
  roles: z.array(z.enum(roles)).min(1).optional(),
  headline: z.string(),
  bio: z.string(),
  location: z.string(),
  avatar: z.string(),
  skills: z.array(z.string()),
  interests: z.array(z.string()),
  experienceLevel: z.enum(["student", "entry", "mid", "senior"]),
  remotePreference: z.enum(["any", "remote", "onsite"]),
  isDemo: z.literal(true),
  status: z.enum(["active", "disabled"]),
}).transform((user) => ({ ...user, roles: user.roles ?? [user.role] }));
const opportunitySchema = z.object({
  id: z.string(),
  publisherId: z.string(),
  organization: z.string(),
  title: z.string(),
  type: z.enum(opportunityTypes),
  category: z.string(),
  description: z.string(),
  responsibilities: z.array(z.string()),
  eligibility: z.array(z.string()),
  skills: z.array(z.string()),
  location: z.string(),
  remote: z.boolean(),
  experienceLevel: z.enum(["student", "entry", "mid", "senior"]),
  compensationMin: z.number().nullable(),
  compensationMax: z.number().nullable(),
  compensationUnit: z.string(),
  deadline: timestampSchema,
  status: z.enum(opportunityStatuses),
  createdAt: timestampSchema,
  isDemo: z.literal(true),
});

export const OpportunityBridgeStoreSchema = z.object({
  version: z.literal(1),
  users: z.array(userProfileSchema),
  opportunities: z.array(opportunitySchema),
  applications: z.array(z.object({
    id: z.string(),
    opportunityId: z.string(),
    applicantId: z.string(),
    status: z.enum(applicationStatuses),
    coverNote: z.string(),
    internalNote: z.string(),
    submittedAt: timestampSchema,
    updatedAt: timestampSchema,
  })),
  applicationStatusHistory: z.array(z.object({
    id: z.string(),
    applicationId: z.string(),
    actorId: z.string(),
    fromStatus: z.enum(applicationStatuses).nullable(),
    toStatus: z.enum(applicationStatuses),
    createdAt: timestampSchema,
    isDemo: z.literal(true),
  })).default([]),
  connections: z.array(z.object({
    id: z.string(),
    requesterId: z.string(),
    recipientId: z.string(),
    status: z.enum(connectionStatuses),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })),
  conversations: z.array(z.object({
    id: z.string(),
    participantIds: z.tuple([z.string(), z.string()]),
    updatedAt: timestampSchema,
  })),
  messages: z.array(z.object({
    id: z.string(),
    conversationId: z.string(),
    senderId: z.string(),
    body: z.string(),
    createdAt: timestampSchema,
    readAt: timestampSchema.nullable(),
  })),
  notifications: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    type: z.enum(["application", "connection", "message", "system"]),
    title: z.string(),
    body: z.string(),
    href: z.string(),
    readAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    isDemo: z.literal(true),
  })),
  savedOpportunities: z.array(z.object({ userId: z.string(), opportunityId: z.string(), createdAt: timestampSchema })),
  savedProfiles: z.array(z.object({ userId: z.string(), savedProfileId: z.string(), createdAt: timestampSchema })),
  moderationRecords: z.array(z.object({
    id: z.string(),
    moderatorId: z.string(),
    targetType: z.enum(["user", "opportunity", "report"]),
    targetId: z.string(),
    action: z.enum(["disable", "restore", "pause", "publish", "reject", "review", "dismiss"]),
    reason: z.string(),
    createdAt: timestampSchema,
  })),
  contactSubmissions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    topic: z.string(),
    message: z.string(),
    createdAt: timestampSchema,
  })),
  mentoringSessions: z.array(z.object({
    id: z.string(),
    requesterId: z.string(),
    providerId: z.string(),
    serviceType: z.enum(["mentorship", "cv-review", "pitch-review", "strategy"]),
    requestNote: z.string(),
    scheduledFor: timestampSchema.nullable(),
    status: z.enum(["requested", "accepted", "declined", "cancelled", "completed"]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })).default([]),
  userBlocks: z.array(z.object({
    id: z.string(),
    blockerId: z.string(),
    blockedUserId: z.string(),
    createdAt: timestampSchema,
  })).default([]),
  reports: z.array(z.object({
    id: z.string(),
    reporterId: z.string(),
    targetType: z.enum(["user", "opportunity"]),
    targetId: z.string(),
    reason: z.string().min(1).max(80),
    details: z.string().max(500),
    status: z.enum(["open", "reviewed", "dismissed"]),
    createdAt: timestampSchema,
  })).default([]),
  startups: z.array(z.object({
    id: z.string(),
    founderId: z.string(),
    name: z.string(),
    industry: z.string(),
    stage: z.enum(["idea", "pre-seed", "seed", "series-a"]),
    summary: z.string(),
    fundingAskInr: z.number().nonnegative().nullable(),
    isDemo: z.literal(true),
  })).default([]),
  organizations: z.array(z.object({
    id: z.string(),
    ownerId: z.string(),
    type: z.enum(["startup", "company"]),
    name: z.string().min(2).max(120),
    industry: z.string().min(2).max(80),
    businessEmail: z.string().email().max(150),
    website: z.string().max(200),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    isDemo: z.literal(true),
  })).default([]),
  organizationMembers: z.array(z.object({
    id: z.string(),
    organizationId: z.string(),
    userId: z.string(),
    role: z.enum(["owner", "administrator", "recruiter", "authorized-representative", "read-only"]),
    createdAt: timestampSchema,
  })).default([]),
  companyVerificationRequests: z.array(z.object({
    id: z.string(),
    organizationId: z.string(),
    submittedBy: z.string(),
    identifierType: z.enum(["cin", "llpin", "gstin", "dpiit", "other"]),
    identifier: z.string().min(1).max(100),
    details: z.string().max(1000),
    status: z.enum(["pending-verification", "verified", "rejected", "additional-information-required", "expired"]),
    reviewNote: z.string().max(500),
    reviewedBy: z.string().nullable(),
    reviewedAt: timestampSchema.nullable(),
    submittedAt: timestampSchema,
    updatedAt: timestampSchema,
  })).default([]),
  companyVerificationAudit: z.array(z.object({
    id: z.string(),
    organizationId: z.string(),
    requestId: z.string(),
    actorId: z.string(),
    action: z.enum(["submitted", "resubmitted", "verified", "rejected", "additional-information-required", "expired"]),
    note: z.string().max(500),
    createdAt: timestampSchema,
  })).default([]),
  sessionDocuments: z.array(z.object({
    id: z.string(),
    sessionId: z.string(),
    ownerId: z.string(),
    fileName: z.string().min(1).max(120),
    mimeType: z.literal("application/pdf"),
    size: z.number().int().positive().max(5 * 1024 * 1024),
    createdAt: timestampSchema,
  })).default([]),
});

export const SessionSchema = z.object({
  demoUserId: z.string().min(1).max(80),
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(150),
  role: z.enum(roles),
  roles: z.array(z.enum(roles)).min(1).max(roles.length).optional(),
  location: z.string().trim().min(2).max(100),
  skills: z.array(z.string().trim().min(1).max(40)).max(12),
  organizationName: z.string().trim().max(120).optional().default(""),
  industry: z.string().trim().max(80).optional().default(""),
  businessEmail: z.string().trim().email().max(150).optional().or(z.literal("")).default(""),
  website: z.string().trim().max(200).optional().default(""),
  identifierType: z.enum(["cin", "llpin", "gstin", "dpiit", "other"]).optional(),
  identifier: z.string().trim().max(100).optional().default(""),
  verificationDetails: z.string().trim().max(1000).optional().default(""),
}).superRefine((registration, context) => {
  const isOrganizationRole = registration.role === "founder" || registration.role === "existing-company";
  if (isOrganizationRole && registration.organizationName.length < 2) {
    context.addIssue({ code: "custom", path: ["organizationName"], message: "Enter your organization name." });
  }
  if (isOrganizationRole && registration.industry.length < 2) {
    context.addIssue({ code: "custom", path: ["industry"], message: "Enter your organization industry." });
  }
  if (registration.website && !z.string().url().safeParse(registration.website).success) {
    context.addIssue({ code: "custom", path: ["website"], message: "Enter a complete website URL, including https://." });
  }
  if (Boolean(registration.identifierType) !== Boolean(registration.identifier)) {
    context.addIssue({ code: "custom", path: ["identifier"], message: "Provide both an identifier type and identifier, or leave both blank." });
  }
  if (registration.identifierType && registration.identifier
    && !isValidRegistrationIdentifier(registration.identifierType, registration.identifier)) {
    context.addIssue({ code: "custom", path: ["identifier"], message: "The identifier does not match the selected format. Format checks do not verify identity." });
  }
  if (registration.identifier && !isOrganizationRole) {
    context.addIssue({ code: "custom", path: ["identifier"], message: "Only an organization profile can submit a company identifier." });
  }
});

const boundedString = (maximum: number) => z.string().trim().min(1).max(maximum);

export const CreateOpportunitySchema = z.object({
  title: boundedString(100),
  type: z.enum(opportunityTypes),
  category: boundedString(50),
  description: boundedString(3000),
  skills: z.array(z.string().trim().min(1).max(40)).min(1).max(12),
  location: boundedString(100),
  remote: z.boolean(),
  deadline: z.iso.datetime(),
  compensationMin: z.number().nonnegative().max(1_000_000_000).nullable(),
  compensationMax: z.number().nonnegative().max(1_000_000_000).nullable(),
  compensationUnit: boundedString(50),
});

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("save-opportunity"), opportunityId: boundedString(80), saved: z.boolean() }),
  z.object({ type: z.literal("save-profile"), profileId: boundedString(80), saved: z.boolean() }),
  z.object({ type: z.literal("apply"), opportunityId: boundedString(80), coverNote: z.string().trim().max(2000).default("") }),
  z.object({ type: z.literal("application-status"), applicationId: boundedString(80), status: z.enum(["reviewing", "shortlisted", "interview", "accepted", "rejected"]) }),
  z.object({ type: z.literal("publisher-note"), applicationId: boundedString(80), internalNote: z.string().trim().max(300) }),
  z.object({ type: z.literal("withdraw-application"), applicationId: boundedString(80) }),
  z.object({ type: z.literal("connection-request"), recipientId: boundedString(80) }),
  z.object({ type: z.literal("connection-update"), connectionId: boundedString(80), action: z.enum(["accept", "decline", "cancel", "remove"]) }),
  z.object({ type: z.literal("send-message"), conversationId: boundedString(80), body: boundedString(2000) }),
  z.object({ type: z.literal("mark-conversation-read"), conversationId: boundedString(80) }),
  z.object({ type: z.literal("start-conversation"), recipientId: boundedString(80), body: z.string().trim().max(2000).default("") }),
  z.object({ type: z.literal("mark-notification-read"), notificationId: boundedString(80) }),
  z.object({ type: z.literal("update-profile"), headline: z.string().trim().max(140), bio: z.string().trim().max(500), location: z.string().trim().max(100), skills: z.array(z.string().trim().min(1).max(40)).max(12), interests: z.array(z.string().trim().min(1).max(40)).max(12), remotePreference: z.enum(["any", "remote", "onsite"]), roles: z.array(z.enum(roles)).min(1).max(roles.length) }),
  z.object({ type: z.literal("session-request"), providerId: boundedString(80), serviceType: z.enum(["mentorship", "cv-review", "pitch-review", "strategy"]), requestNote: z.string().trim().max(500), scheduledFor: timestampSchema.nullable() }),
  z.object({ type: z.literal("session-update"), sessionId: boundedString(80), action: z.enum(["accept", "decline", "cancel", "complete"]) }),
  z.object({ type: z.literal("report-content"), targetType: z.enum(["user", "opportunity"]), targetId: boundedString(80), reason: boundedString(80), details: z.string().trim().max(500) }),
  z.object({ type: z.literal("block-user"), userId: boundedString(80), blocked: z.boolean() }),
  z.object({ type: z.literal("review-report"), reportId: boundedString(80), status: z.enum(["reviewed", "dismissed"]) }),
  z.object({ type: z.literal("moderate-opportunity"), opportunityId: boundedString(80), action: z.enum(["pause", "publish", "reject"]), reason: boundedString(300) }),
  z.object({ type: z.literal("moderate-user"), userId: boundedString(80), action: z.enum(["disable", "restore"]), reason: boundedString(300) }),
  z.object({
    type: z.literal("submit-company-verification"),
    organizationName: boundedString(120),
    industry: boundedString(80),
    businessEmail: z.string().trim().email().max(150),
    website: z.string().trim().max(200).default("").refine((value) => !value || z.url().safeParse(value).success, "Enter a valid website URL."),
    identifierType: z.enum(["cin", "llpin", "gstin", "dpiit", "other"]),
    identifier: boundedString(100),
    details: z.string().trim().max(1000).default(""),
  }),
  z.object({
    type: z.literal("review-company-verification"),
    requestId: boundedString(80),
    status: z.enum(["verified", "rejected", "additional-information-required", "expired"]),
    note: z.string().trim().max(500).default(""),
  }),
]);

export type OpportunityAction = z.infer<typeof ActionSchema>;
