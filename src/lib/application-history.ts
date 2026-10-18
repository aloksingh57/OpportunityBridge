import type { Application, ApplicationStatusHistory } from "@/types/opportunity-bridge";

export function migrateApplicationStatusHistory(
  applications: Application[],
): ApplicationStatusHistory[] {
  return applications.map((application) => ({
    id: `application-history-migrated-${application.id}`,
    applicationId: application.id,
    actorId: "system:legacy-migration",
    fromStatus: null,
    toStatus: application.status,
    createdAt: application.submittedAt,
    isDemo: true,
  }));
}
