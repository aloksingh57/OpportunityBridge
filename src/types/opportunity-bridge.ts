export const roles = [
  "student",
  "job-seeker",
  "founder",
  "investor",
  "mentor",
  "advisor",
  "recruiter",
] as const;

export type Role = (typeof roles)[number];
export type ActorRole = Role | "admin";

export type OpportunityType =
  | "internship"
  | "full-time"
  | "part-time"
  | "freelance"
  | "student-project"
  | "scholarship"
  | "hackathon"
  | "startup-funding"
  | "mentorship"
  | "advisory";

export type OpportunityStatus = "draft" | "published" | "paused" | "closed" | "rejected";
export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "accepted"
  | "rejected"
  | "withdrawn";
export type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  roles: Role[];
  headline: string;
  bio: string;
  location: string;
  avatar: string;
  skills: string[];
  interests: string[];
  experienceLevel: "student" | "entry" | "mid" | "senior";
  remotePreference: "any" | "remote" | "onsite";
  isDemo: true;
  status: "active" | "disabled";
}

export interface Opportunity {
  id: string;
  publisherId: string;
  organization: string;
  title: string;
  type: OpportunityType;
  category: string;
  description: string;
  responsibilities: string[];
  eligibility: string[];
  skills: string[];
  location: string;
  remote: boolean;
  experienceLevel: UserProfile["experienceLevel"];
  compensationMin: number | null;
  compensationMax: number | null;
  compensationUnit: string;
  deadline: string;
  status: OpportunityStatus;
  createdAt: string;
  isDemo: true;
}

export interface Application {
  id: string;
  opportunityId: string;
  applicantId: string;
  status: ApplicationStatus;
  coverNote: string;
  internalNote: string;
  submittedAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  participantIds: [string, string];
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: "application" | "connection" | "message" | "system";
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
  isDemo: true;
}

export interface SavedOpportunity {
  userId: string;
  opportunityId: string;
  createdAt: string;
}

export interface SavedProfile {
  userId: string;
  savedProfileId: string;
  createdAt: string;
}

export interface ModerationRecord {
  id: string;
  moderatorId: string;
  targetType: "user" | "opportunity" | "report";
  targetId: string;
  action: "disable" | "restore" | "pause" | "publish" | "reject" | "review" | "dismiss";
  reason: string;
  createdAt: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
}

export interface MentoringSession {
  id: string;
  requesterId: string;
  providerId: string;
  serviceType: "mentorship" | "cv-review" | "pitch-review" | "strategy";
  requestNote: string;
  scheduledFor: string | null;
  status: "requested" | "accepted" | "declined" | "cancelled" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface SessionDocument {
  id: string;
  sessionId: string;
  ownerId: string;
  fileName: string;
  mimeType: "application/pdf";
  size: number;
  createdAt: string;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: "user" | "opportunity";
  targetId: string;
  reason: string;
  details: string;
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
}

export interface StartupProfile {
  id: string;
  founderId: string;
  name: string;
  industry: string;
  stage: "idea" | "pre-seed" | "seed" | "series-a";
  summary: string;
  fundingAskInr: number | null;
  isDemo: true;
}

export interface OpportunityBridgeStore {
  version: 1;
  users: UserProfile[];
  opportunities: Opportunity[];
  applications: Application[];
  connections: Connection[];
  conversations: Conversation[];
  messages: Message[];
  notifications: NotificationRecord[];
  savedOpportunities: SavedOpportunity[];
  savedProfiles: SavedProfile[];
  moderationRecords: ModerationRecord[];
  contactSubmissions: ContactSubmission[];
  mentoringSessions: MentoringSession[];
  userBlocks: UserBlock[];
  reports: ContentReport[];
  startups: StartupProfile[];
  sessionDocuments: SessionDocument[];
}

export type PublicUser = Omit<UserProfile, "email" | "status">;

export interface BootstrapData {
  currentUser: PublicUser | null;
  isAdmin: boolean;
  people: PublicUser[];
  opportunities: Opportunity[];
  applications: Array<
    Omit<Application, "internalNote"> & { internalNote?: string; applicant?: PublicUser; opportunity?: Opportunity }
  >;
  connections: Array<Connection & { otherPerson: PublicUser }>;
  conversations: Array<Conversation & { otherPerson: PublicUser; messages: Message[] }>;
  mentoringSessions: Array<MentoringSession & { otherPerson: PublicUser; documents: SessionDocument[] }>;
  notifications: NotificationRecord[];
  savedOpportunityIds: string[];
  savedProfileIds: string[];
  blockedProfileIds: string[];
  blockedProfiles: PublicUser[];
  startups: Array<StartupProfile & { founder: PublicUser }>;
  metrics: {
    applications: number;
    savedOpportunities: number;
    publishedOpportunities: number;
    applicants: number;
    connections: number;
    unreadNotifications: number;
    profileCompletion: number;
  };
  adminSummary?: {
    users: UserProfile[];
    opportunities: Opportunity[];
    moderationRecords: ModerationRecord[];
    contactSubmissions: ContactSubmission[];
    reports: ContentReport[];
  };
}
