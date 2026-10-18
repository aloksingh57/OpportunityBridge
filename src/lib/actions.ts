import { newId, updateStore } from "@/lib/store";
import { canTransitionApplication } from "@/lib/recommendations";
import type { OpportunityAction } from "@/lib/validation";
import type {
  ActorRole,
  Application,
  NotificationRecord,
  Opportunity,
  OpportunityBridgeStore,
  Role,
  UserProfile,
} from "@/types/opportunity-bridge";

export class ActionError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ActionError";
  }
}

function addNotification(
  store: OpportunityBridgeStore,
  userId: string,
  type: NotificationRecord["type"],
  title: string,
  body: string,
  href: string,
): void {
  store.notifications.unshift({
    id: newId("notification"),
    userId,
    type,
    title,
    body,
    href,
    readAt: null,
    createdAt: new Date().toISOString(),
    isDemo: true,
  });
}

function getVisibleOpportunity(
  store: OpportunityBridgeStore,
  opportunityId: string,
  actor: { id: string; isAdmin: boolean },
): Opportunity {
  const opportunity = store.opportunities.find((item) => item.id === opportunityId);
  if (!opportunity) throw new ActionError("That opportunity could not be found.", 404);
  if (isBlocked(store, actor.id, opportunity.publisherId)) {
    throw new ActionError("This opportunity is unavailable.", 404);
  }
  const isPublic = opportunity.status === "published" && new Date(opportunity.deadline) >= new Date();
  if (!isPublic && opportunity.publisherId !== actor.id && !actor.isAdmin) {
    throw new ActionError("This opportunity is not available.", 404);
  }
  return opportunity;
}

function requireUser(
  store: OpportunityBridgeStore,
  userId: string,
): UserProfile {
  const user = store.users.find((record) => record.id === userId && record.status === "active");
  if (!user) throw new ActionError("Your demo profile is no longer active. Choose another demo profile.", 403);
  return user;
}

function isBlocked(store: OpportunityBridgeStore, firstUserId: string, secondUserId: string): boolean {
  return store.userBlocks.some((block) =>
    (block.blockerId === firstUserId && block.blockedUserId === secondUserId)
    || (block.blockerId === secondUserId && block.blockedUserId === firstUserId),
  );
}

export async function runAction(
  actor: { id: string; role: ActorRole; roles?: Role[]; isAdmin: boolean },
  action: OpportunityAction,
): Promise<{ message: string }> {
  return updateStore((store) => {
    const currentUser = actor.isAdmin ? null : requireUser(store, actor.id);
    const now = new Date().toISOString();

    switch (action.type) {
      case "save-opportunity": {
        const opportunity = getVisibleOpportunity(store, action.opportunityId, actor);
        const index = store.savedOpportunities.findIndex((item) => item.userId === actor.id && item.opportunityId === opportunity.id);
        if (action.saved && index < 0) store.savedOpportunities.push({ userId: actor.id, opportunityId: opportunity.id, createdAt: now });
        if (!action.saved && index >= 0) store.savedOpportunities.splice(index, 1);
        return { message: action.saved ? "Opportunity saved to your list." : "Opportunity removed from your saved list." };
      }
      case "save-profile": {
        const profile = store.users.find((item) => item.id === action.profileId && item.status === "active");
        if (!profile) throw new ActionError("That profile could not be found.", 404);
        if (profile.id === actor.id) throw new ActionError("You cannot save your own profile.", 400);
        const index = store.savedProfiles.findIndex((item) => item.userId === actor.id && item.savedProfileId === profile.id);
        if (action.saved && index < 0) store.savedProfiles.push({ userId: actor.id, savedProfileId: profile.id, createdAt: now });
        if (!action.saved && index >= 0) store.savedProfiles.splice(index, 1);
        return { message: action.saved ? "Profile saved." : "Profile removed from your saved profiles." };
      }
      case "apply": {
        if (!currentUser || !currentUser.roles.some((role) => role === "student" || role === "job-seeker")) {
          throw new ActionError("Applications are available to student and job-seeker demo profiles.", 403);
        }
        const opportunity = getVisibleOpportunity(store, action.opportunityId, actor);
        if (opportunity.publisherId === actor.id) throw new ActionError("You cannot apply to your own opportunity.", 400);
        if (new Date(opportunity.deadline) < new Date()) throw new ActionError("The application deadline has passed.", 409);
        if (store.applications.some((item) => item.applicantId === actor.id && item.opportunityId === opportunity.id)) {
          throw new ActionError("You have already applied to this opportunity.", 409);
        }
        const application: Application = {
          id: newId("application"),
          opportunityId: opportunity.id,
          applicantId: actor.id,
          status: "submitted",
          coverNote: action.coverNote,
          internalNote: "",
          submittedAt: now,
          updatedAt: now,
        };
        store.applications.push(application);
        store.applicationStatusHistory.push({
          id: newId("application-history"),
          applicationId: application.id,
          actorId: actor.id,
          fromStatus: null,
          toStatus: application.status,
          createdAt: now,
          isDemo: true,
        });
        addNotification(store, actor.id, "application", "Application received", `Your application for ${opportunity.title} has been saved.`, "/applications");
        addNotification(store, opportunity.publisherId, "application", "A new demo application arrived", `Someone applied for ${opportunity.title}.`, "/manage-applicants");
        return { message: "Your application was submitted and saved." };
      }
      case "application-status": {
        if (!currentUser && !actor.isAdmin) throw new ActionError("Sign in to manage applications.", 401);
        const application = store.applications.find((item) => item.id === action.applicationId);
        if (!application) throw new ActionError("That application could not be found.", 404);
        const opportunity = store.opportunities.find((item) => item.id === application.opportunityId);
        if (!opportunity || (opportunity.publisherId !== actor.id && !actor.isAdmin)) throw new ActionError("You are not allowed to update this application.", 403);
        if (!canTransitionApplication(application.status, action.status)) {
          throw new ActionError(`An application cannot move from ${application.status} to ${action.status}.`, 409);
        }
        const fromStatus = application.status;
        application.status = action.status;
        application.updatedAt = now;
        store.applicationStatusHistory.push({
          id: newId("application-history"),
          applicationId: application.id,
          actorId: actor.id,
          fromStatus,
          toStatus: action.status,
          createdAt: now,
          isDemo: true,
        });
        addNotification(store, application.applicantId, "application", "Application status changed", `Your application for ${opportunity.title} is now ${action.status}.`, `/applications/${application.id}`);
        return { message: `Application updated to ${action.status}.` };
      }
      case "publisher-note": {
        const application = store.applications.find((item) => item.id === action.applicationId);
        if (!application) throw new ActionError("That application could not be found.", 404);
        const opportunity = store.opportunities.find((item) => item.id === application.opportunityId);
        if (!opportunity || (opportunity.publisherId !== actor.id && !actor.isAdmin)) {
          throw new ActionError("Only the listing publisher or an administrator can edit this private note.", 403);
        }
        application.internalNote = action.internalNote;
        application.updatedAt = now;
        return { message: "Private publisher note saved." };
      }
      case "withdraw-application": {
        const application = store.applications.find((item) => item.id === action.applicationId);
        if (!application) throw new ActionError("That application could not be found.", 404);
        if (application.applicantId !== actor.id) throw new ActionError("Only the applicant can withdraw this application.", 403);
        if (!canTransitionApplication(application.status, "withdrawn")) throw new ActionError("This application can no longer be withdrawn.", 409);
        const fromStatus = application.status;
        application.status = "withdrawn";
        application.updatedAt = now;
        store.applicationStatusHistory.push({
          id: newId("application-history"),
          applicationId: application.id,
          actorId: actor.id,
          fromStatus,
          toStatus: "withdrawn",
          createdAt: now,
          isDemo: true,
        });
        return { message: "Your application was withdrawn." };
      }
      case "connection-request": {
        const recipient = store.users.find((item) => item.id === action.recipientId && item.status === "active");
        if (!currentUser) throw new ActionError("Sign in with a demo profile to connect.", 401);
        if (!recipient) throw new ActionError("That profile could not be found.", 404);
        if (isBlocked(store, actor.id, recipient.id)) throw new ActionError("This connection is unavailable.", 403);
        if (recipient.id === actor.id) throw new ActionError("You cannot send a connection request to yourself.", 400);
        const existing = store.connections.find((connection) =>
          [connection.requesterId, connection.recipientId].includes(actor.id)
          && [connection.requesterId, connection.recipientId].includes(recipient.id)
          && (connection.status === "pending" || connection.status === "accepted"),
        );
        if (existing) throw new ActionError(existing.status === "accepted" ? "You are already connected." : "A connection request is already pending.", 409);
        const incoming = store.connections.find((connection) =>
          connection.requesterId === recipient.id && connection.recipientId === actor.id && connection.status === "pending",
        );
        if (incoming) {
          incoming.status = "accepted";
          incoming.updatedAt = now;
          addNotification(store, recipient.id, "connection", "Connection accepted", `${currentUser.name} accepted your request.`, "/connections");
          return { message: `You are now connected with ${recipient.name}.` };
        }
        store.connections.push({
          id: newId("connection"),
          requesterId: actor.id,
          recipientId: recipient.id,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
        addNotification(store, recipient.id, "connection", "New connection request", `${currentUser.name} would like to connect.`, "/connections");
        return { message: `Connection request sent to ${recipient.name}.` };
      }
      case "connection-update": {
        const connection = store.connections.find((item) => item.id === action.connectionId);
        if (!connection) throw new ActionError("That connection could not be found.", 404);
        if (isBlocked(store, connection.requesterId, connection.recipientId)) {
          throw new ActionError("This connection is unavailable.", 403);
        }
        if (action.action === "remove") {
          if (connection.status !== "accepted" || ![connection.requesterId, connection.recipientId].includes(actor.id)) {
            throw new ActionError("You cannot remove this connection.", 403);
          }
          store.connections = store.connections.filter((item) => item.id !== connection.id);
          return { message: "Connection removed." };
        }
        if (connection.status !== "pending") throw new ActionError("Only a pending request can be changed.", 409);
        if ((action.action === "accept" || action.action === "decline") && connection.recipientId !== actor.id) {
          throw new ActionError("Only the recipient can accept or decline this request.", 403);
        }
        if (action.action === "cancel" && connection.requesterId !== actor.id) {
          throw new ActionError("Only the requester can cancel this request.", 403);
        }
        connection.status = action.action === "accept" ? "accepted" : action.action === "decline" ? "declined" : "cancelled";
        connection.updatedAt = now;
        const otherId = connection.requesterId === actor.id ? connection.recipientId : connection.requesterId;
        addNotification(store, otherId, "connection", `Connection request ${connection.status}`, "Your connection list has been updated.", "/connections");
        return { message: `Connection request ${connection.status}.` };
      }
      case "send-message": {
        const conversation = store.conversations.find((item) => item.id === action.conversationId);
        if (!conversation || !conversation.participantIds.includes(actor.id)) {
          throw new ActionError("This conversation is not available to your profile.", 403);
        }
        const recipientId = conversation.participantIds.find((id) => id !== actor.id);
        if (recipientId && isBlocked(store, actor.id, recipientId)) throw new ActionError("This conversation is unavailable.", 403);
        store.messages.push({
          id: newId("message"),
          conversationId: conversation.id,
          senderId: actor.id,
          body: action.body,
          createdAt: now,
          readAt: null,
        });
        conversation.updatedAt = now;
        if (recipientId) addNotification(store, recipientId, "message", "New message", "Open your inbox to read the new message.", "/messages");
        return { message: "Message sent." };
      }
      case "mark-conversation-read": {
        const conversation = store.conversations.find((item) =>
          item.id === action.conversationId && item.participantIds.includes(actor.id),
        );
        if (!conversation) throw new ActionError("This conversation is not available to your profile.", 403);
        const otherParticipantId = conversation.participantIds.find((id) => id !== actor.id);
        if (otherParticipantId && isBlocked(store, actor.id, otherParticipantId)) {
          throw new ActionError("This conversation is unavailable.", 403);
        }
        for (const message of store.messages) {
          if (message.conversationId === conversation.id && message.senderId !== actor.id && !message.readAt) {
            message.readAt = now;
          }
        }
        return { message: "Conversation marked as read." };
      }
      case "start-conversation": {
        const recipient = store.users.find((item) => item.id === action.recipientId && item.status === "active");
        if (!currentUser) throw new ActionError("Sign in with a demo profile to message people.", 401);
        if (!recipient || recipient.id === actor.id) throw new ActionError("Choose another active profile to message.", 400);
        if (isBlocked(store, actor.id, recipient.id)) throw new ActionError("This conversation is unavailable.", 403);
        const connected = store.connections.some((connection) =>
          connection.status === "accepted"
          && [connection.requesterId, connection.recipientId].includes(actor.id)
          && [connection.requesterId, connection.recipientId].includes(recipient.id),
        );
        if (!connected) throw new ActionError("Connect with this person before starting a conversation.", 403);
        let conversation = store.conversations.find((item) =>
          item.participantIds.includes(actor.id) && item.participantIds.includes(recipient.id),
        );
        if (!conversation) {
          conversation = { id: newId("conversation"), participantIds: [actor.id, recipient.id], updatedAt: now };
          store.conversations.push(conversation);
        }
        if (action.body) {
          store.messages.push({ id: newId("message"), conversationId: conversation.id, senderId: actor.id, body: action.body, createdAt: now, readAt: null });
          conversation.updatedAt = now;
          addNotification(store, recipient.id, "message", "New message", "Open your inbox to read the new message.", "/messages");
        }
        return { message: "Conversation opened." };
      }
      case "mark-notification-read": {
        const notification = store.notifications.find((item) => item.id === action.notificationId && item.userId === actor.id);
        if (!notification) throw new ActionError("That notification could not be found.", 404);
        notification.readAt = now;
        return { message: "Notification marked as read." };
      }
      case "update-profile": {
        if (!currentUser) throw new ActionError("Sign in with a demo profile to edit your profile.", 401);
        currentUser.headline = action.headline;
        currentUser.bio = action.bio;
        currentUser.location = action.location;
        currentUser.skills = [...new Set(action.skills)];
        currentUser.interests = [...new Set(action.interests)];
        currentUser.remotePreference = action.remotePreference;
        currentUser.roles = [...new Set(action.roles)];
        currentUser.role = action.roles.includes(currentUser.role) ? currentUser.role : action.roles[0]!;
        return { message: "Your profile changes were saved." };
      }
      case "session-request": {
        if (!currentUser) throw new ActionError("Sign in with a demo profile to request a session.", 401);
        const provider = store.users.find((user) => user.id === action.providerId && user.status === "active");
        if (!provider || (!provider.roles.includes("mentor") && !provider.roles.includes("advisor"))) {
          throw new ActionError("Choose an active mentor or advisor profile.", 404);
        }
        const requiredRole = action.serviceType === "mentorship" || action.serviceType === "cv-review" ? "mentor" : "advisor";
        if (!provider.roles.includes(requiredRole)) {
          throw new ActionError(`This provider does not offer ${action.serviceType.replace("-", " ")} sessions.`, 400);
        }
        if (provider.id === currentUser.id) throw new ActionError("You cannot request a session with yourself.", 400);
        if (isBlocked(store, currentUser.id, provider.id)) throw new ActionError("This session is unavailable.", 403);
        if (action.scheduledFor) {
          const scheduledTime = new Date(action.scheduledFor).getTime();
          if (scheduledTime <= Date.now() || scheduledTime > Date.now() + 120 * 86_400_000) {
            throw new ActionError("Choose a proposed time within the next 120 days.", 400);
          }
        }
        if (store.mentoringSessions.some((session) =>
          session.requesterId === currentUser.id
          && session.providerId === provider.id
          && session.status === "requested",
        )) {
          throw new ActionError("You already have a pending session request with this person.", 409);
        }
        const session = {
          id: newId("session"),
          requesterId: currentUser.id,
          providerId: provider.id,
          serviceType: action.serviceType,
          requestNote: action.requestNote,
          scheduledFor: action.scheduledFor,
          status: "requested" as const,
          createdAt: now,
          updatedAt: now,
        };
        store.mentoringSessions.unshift(session);
        addNotification(store, provider.id, "system", "A session request arrived", `${currentUser.name} requested a ${action.serviceType.replace("-", " ")} session.`, "/sessions");
        return { message: "Your session request was sent. The provider can accept or decline it." };
      }
      case "session-update": {
        const session = store.mentoringSessions.find((item) => item.id === action.sessionId);
        if (!session) throw new ActionError("That session request could not be found.", 404);
        const isProvider = session.providerId === actor.id;
        const isRequester = session.requesterId === actor.id;
        if (isBlocked(store, session.requesterId, session.providerId)) {
          throw new ActionError("This session is unavailable.", 403);
        }
        if (action.action === "accept" || action.action === "decline") {
          if (!isProvider) throw new ActionError("Only the mentor or advisor can respond to this request.", 403);
          if (session.status !== "requested") throw new ActionError("This session request has already been answered.", 409);
          session.status = action.action === "accept" ? "accepted" : "declined";
        } else if (action.action === "cancel") {
          if (!isRequester) throw new ActionError("Only the requester can cancel this session.", 403);
          if (session.status !== "requested" && session.status !== "accepted") throw new ActionError("This session can no longer be cancelled.", 409);
          session.status = "cancelled";
        } else {
          if (!isProvider) throw new ActionError("Only the mentor or advisor can complete this session.", 403);
          if (session.status !== "accepted") throw new ActionError("Only an accepted session can be completed.", 409);
          if (session.scheduledFor && new Date(session.scheduledFor).getTime() > Date.now()) {
            throw new ActionError("A session cannot be completed before its proposed time.", 409);
          }
          session.status = "completed";
        }
        session.updatedAt = now;
        const notifyUserId = isProvider ? session.requesterId : session.providerId;
        addNotification(store, notifyUserId, "system", `Session ${session.status}`, "Your mentoring or advisory session was updated.", "/sessions");
        return { message: `Session ${session.status}.` };
      }
      case "report-content": {
        if (!currentUser) throw new ActionError("Sign in with a demo profile to submit a report.", 401);
        const exists = action.targetType === "user"
          ? store.users.some((user) => user.id === action.targetId && user.status === "active")
          : store.opportunities.some((item) => item.id === action.targetId);
        if (!exists) throw new ActionError("That content could not be found.", 404);
        if (action.targetType === "user" && action.targetId === currentUser.id) throw new ActionError("You cannot report your own profile.", 400);
        if (store.reports.some((report) => report.reporterId === actor.id && report.targetType === action.targetType && report.targetId === action.targetId && report.status === "open")) {
          throw new ActionError("You already have an open report for this content.", 409);
        }
        store.reports.unshift({
          id: newId("report"),
          reporterId: actor.id,
          targetType: action.targetType,
          targetId: action.targetId,
          reason: action.reason,
          details: action.details,
          status: "open",
          createdAt: now,
        });
        return { message: "Your report was recorded for administrator review." };
      }
      case "block-user": {
        if (!currentUser) throw new ActionError("Sign in with a demo profile to manage blocked profiles.", 401);
        if (action.userId === currentUser.id) throw new ActionError("You cannot block your own profile.", 400);
        const target = store.users.find((user) => user.id === action.userId && user.status === "active");
        if (!target) throw new ActionError("That profile could not be found.", 404);
        const existing = store.userBlocks.find((block) => block.blockerId === actor.id && block.blockedUserId === target.id);
        if (action.blocked && !existing) {
          store.userBlocks.push({ id: newId("block"), blockerId: actor.id, blockedUserId: target.id, createdAt: now });
        } else if (!action.blocked && existing) {
          store.userBlocks = store.userBlocks.filter((block) => block.id !== existing.id);
        }
        return { message: action.blocked ? `${target.name} was blocked.` : `${target.name} was unblocked.` };
      }
      case "review-report": {
        if (!actor.isAdmin) throw new ActionError("Administrator access is required.", 403);
        const report = store.reports.find((item) => item.id === action.reportId);
        if (!report) throw new ActionError("That report could not be found.", 404);
        if (report.status !== "open") throw new ActionError("This report has already been reviewed.", 409);
        report.status = action.status;
        store.moderationRecords.push({
          id: newId("moderation"),
          moderatorId: actor.id,
          targetType: "report",
          targetId: report.id,
          action: action.status === "reviewed" ? "review" : "dismiss",
          reason: `Report ${action.status}.`,
          createdAt: now,
        });
        return { message: `Report ${action.status}.` };
      }
      case "moderate-opportunity": {
        if (!actor.isAdmin) throw new ActionError("Administrator access is required.", 403);
        const opportunity = store.opportunities.find((item) => item.id === action.opportunityId);
        if (!opportunity) throw new ActionError("That opportunity could not be found.", 404);
        opportunity.status = action.action === "publish" ? "published" : action.action === "pause" ? "paused" : "rejected";
        store.moderationRecords.push({
          id: newId("moderation"),
          moderatorId: actor.id,
          targetType: "opportunity",
          targetId: opportunity.id,
          action: action.action,
          reason: action.reason,
          createdAt: now,
        });
        return { message: `Opportunity ${action.action} action recorded.` };
      }
      case "moderate-user": {
        if (!actor.isAdmin) throw new ActionError("Administrator access is required.", 403);
        const user = store.users.find((item) => item.id === action.userId);
        if (!user) throw new ActionError("That profile could not be found.", 404);
        user.status = action.action === "disable" ? "disabled" : "active";
        store.moderationRecords.push({
          id: newId("moderation"),
          moderatorId: actor.id,
          targetType: "user",
          targetId: user.id,
          action: action.action,
          reason: action.reason,
          createdAt: now,
        });
        return { message: `Profile ${action.action} action recorded.` };
      }
    }
  });
}
