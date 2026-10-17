import { z } from "zod";
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
});
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
    targetType: z.enum(["user", "opportunity"]),
    targetId: z.string(),
    action: z.enum(["disable", "restore", "pause", "publish", "reject"]),
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
});

export const SessionSchema = z.object({
  demoUserId: z.string().min(1).max(80),
});

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(150),
  role: z.enum(roles),
  location: z.string().trim().min(2).max(100),
  skills: z.array(z.string().trim().min(1).max(40)).max(12),
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
  z.object({ type: z.literal("update-profile"), headline: z.string().trim().max(140), bio: z.string().trim().max(500), location: z.string().trim().max(100), skills: z.array(z.string().trim().min(1).max(40)).max(12), interests: z.array(z.string().trim().min(1).max(40)).max(12), remotePreference: z.enum(["any", "remote", "onsite"]) }),
  z.object({ type: z.literal("moderate-opportunity"), opportunityId: boundedString(80), action: z.enum(["pause", "publish", "reject"]), reason: boundedString(300) }),
  z.object({ type: z.literal("moderate-user"), userId: boundedString(80), action: z.enum(["disable", "restore"]), reason: boundedString(300) }),
]);

export type OpportunityAction = z.infer<typeof ActionSchema>;
