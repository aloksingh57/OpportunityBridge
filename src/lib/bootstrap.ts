import { getActor } from "@/lib/auth";
import { readStore } from "@/lib/store";
import type { BootstrapData, PublicUser, UserProfile } from "@/types/opportunity-bridge";

export function toPublicUser(user: UserProfile): PublicUser {
  const { email: _email, status: _status, ...publicUser } = user;
  void _email;
  void _status;
  return publicUser;
}

export async function getBootstrap(cookieHeader?: string): Promise<BootstrapData> {
  const [actor, store] = await Promise.all([getActor(cookieHeader), readStore()]);
  const currentUserRecord = actor && !actor.isAdmin ? store.users.find((user) => user.id === actor.id) ?? null : null;
  const currentUser = currentUserRecord ? toPublicUser(currentUserRecord) : null;
  const today = new Date();
  const publicOpportunities = store.opportunities.filter((opportunity) =>
    opportunity.status === "published" && new Date(opportunity.deadline) >= today,
  );
  const ownedOpportunities = currentUser
    ? store.opportunities.filter((opportunity) => opportunity.publisherId === currentUser.id && opportunity.status !== "rejected")
    : [];
  const canSeeAll = Boolean(actor?.isAdmin);
  const applications = store.applications.flatMap((application) => {
    const opportunity = store.opportunities.find((record) => record.id === application.opportunityId);
    const applicant = store.users.find((record) => record.id === application.applicantId);
    if (!opportunity || !applicant) return [];
    const isApplicant = application.applicantId === actor?.id;
    const isPublisher = opportunity.publisherId === actor?.id;
    if (!canSeeAll && !isApplicant && !isPublisher) return [];
    const visibleApplication = {
      ...application,
      applicant: toPublicUser(applicant),
      opportunity,
    };
    if (!isPublisher && !canSeeAll) {
      const { internalNote: _privateNote, ...withoutPrivateNote } = visibleApplication;
      void _privateNote;
      return [withoutPrivateNote];
    }
    return [visibleApplication];
  });
  const connections = store.connections.flatMap((connection) => {
    if (connection.requesterId !== actor?.id && connection.recipientId !== actor?.id && !canSeeAll) return [];
    const otherId = connection.requesterId === actor?.id ? connection.recipientId : connection.requesterId;
    const otherPerson = store.users.find((user) => user.id === otherId);
    return otherPerson ? [{ ...connection, otherPerson: toPublicUser(otherPerson) }] : [];
  });
  const conversations = store.conversations.flatMap((conversation) => {
    if (!actor || !conversation.participantIds.includes(actor.id)) return [];
    const otherId = conversation.participantIds.find((id) => id !== actor.id);
    const otherPerson = otherId ? store.users.find((user) => user.id === otherId) : undefined;
    if (!otherPerson) return [];
    return [{
      ...conversation,
      otherPerson: toPublicUser(otherPerson),
      messages: store.messages
        .filter((message) => message.conversationId === conversation.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }];
  });
  const applicantApplications = store.applications.filter((application) => application.applicantId === actor?.id);
  const publisherApplications = store.applications.filter((application) => {
    const opportunity = store.opportunities.find((record) => record.id === application.opportunityId);
    return opportunity?.publisherId === actor?.id;
  });
  const userOpportunities = store.savedOpportunities.filter((saved) => saved.userId === actor?.id);
  const userSavedProfiles = store.savedProfiles.filter((saved) => saved.userId === actor?.id);
  const userNotifications = store.notifications.filter((notification) => notification.userId === actor?.id);
  const completion = currentUserRecord
    ? Math.round(100 * [
        Boolean(currentUserRecord.headline),
        Boolean(currentUserRecord.bio),
        Boolean(currentUserRecord.location),
        currentUserRecord.skills.length >= 3,
        currentUserRecord.interests.length >= 2,
      ].filter(Boolean).length / 5)
    : 0;

  return {
    currentUser,
    isAdmin: Boolean(actor?.isAdmin),
    people: store.users.filter((user) => user.status === "active").map(toPublicUser),
    opportunities: canSeeAll
      ? store.opportunities
      : [...publicOpportunities, ...ownedOpportunities.filter((owned) => !publicOpportunities.some((item) => item.id === owned.id))],
    applications,
    connections,
    conversations,
    notifications: userNotifications,
    savedOpportunityIds: userOpportunities.map((saved) => saved.opportunityId),
    savedProfileIds: userSavedProfiles.map((saved) => saved.savedProfileId),
    metrics: {
      applications: applicantApplications.length,
      savedOpportunities: userOpportunities.length,
      publishedOpportunities: ownedOpportunities.filter((opportunity) => opportunity.status === "published").length,
      applicants: publisherApplications.length,
      connections: store.connections.filter((connection) => connection.status === "accepted" && [connection.requesterId, connection.recipientId].includes(actor?.id ?? "")).length,
      unreadNotifications: userNotifications.filter((notification) => !notification.readAt).length,
      profileCompletion: completion,
    },
    ...(canSeeAll ? {
      adminSummary: {
        users: store.users,
        opportunities: store.opportunities,
        moderationRecords: store.moderationRecords,
        contactSubmissions: store.contactSubmissions,
      },
    } : {}),
  };
}
