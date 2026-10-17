import type { Opportunity, UserProfile } from "@/types/opportunity-bridge";

export interface OpportunityRecommendation {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
}

const normalize = (value: number) => Math.max(0, Math.min(1, value));

export function recommendOpportunities(
  user: UserProfile,
  opportunities: Opportunity[],
  today = new Date(),
): OpportunityRecommendation[] {
  return opportunities
    .filter((opportunity) => {
      if (opportunity.status !== "published" || new Date(opportunity.deadline) < today) return false;
      if (opportunity.type === "startup-funding" && user.role !== "founder" && user.role !== "investor") return false;
      if (opportunity.type === "mentorship" && user.role === "mentor") return false;
      if (opportunity.type === "advisory" && user.role === "advisor") return false;
      return true;
    })
    .map((opportunity) => {
      const userSkills = new Set(user.skills.map((skill) => skill.toLowerCase()));
      const matchedSkills = opportunity.skills.filter((skill) => userSkills.has(skill.toLowerCase()));
      const skillFit = opportunity.skills.length === 0 ? 0.5 : matchedSkills.length / opportunity.skills.length;
      const categoryTerms = [opportunity.category, ...opportunity.skills].map((term) => term.toLowerCase());
      const matchingInterests = user.interests.filter((interest) =>
        categoryTerms.some((term) => term.includes(interest.toLowerCase()) || interest.toLowerCase().includes(term)),
      );
      const interestFit = user.interests.length === 0 ? 0.5 : normalize(matchingInterests.length / Math.min(user.interests.length, 2));
      const roleFit = opportunity.type === "internship" || opportunity.type === "student-project" || opportunity.type === "scholarship"
        ? Number(user.role === "student")
        : opportunity.type === "startup-funding"
          ? Number(user.role === "founder" || user.role === "investor")
          : opportunity.type === "mentorship"
            ? Number(user.role !== "mentor")
            : opportunity.type === "advisory"
              ? Number(user.role !== "advisor")
              : Number(user.role === "job-seeker" || user.role === "recruiter" || user.role === "student");
      const city = user.location.split(",")[0]!.toLowerCase();
      const locationFit = user.remotePreference === "remote"
        ? Number(opportunity.remote)
        : user.remotePreference === "onsite"
          ? Number(!opportunity.remote && opportunity.location.toLowerCase().includes(city))
          : Number(opportunity.remote || opportunity.location.toLowerCase().includes(city));
      const experienceFit = opportunity.experienceLevel === user.experienceLevel
        ? 1
        : opportunity.experienceLevel === "entry" && (user.experienceLevel === "student" || user.experienceLevel === "mid")
          ? 0.7
          : 0.35;
      const daysUntilDeadline = (new Date(opportunity.deadline).getTime() - today.getTime()) / 86_400_000;
      const deadlineFit = normalize(daysUntilDeadline / 30);
      const score = Math.round(100 * (
        0.4 * skillFit
        + 0.2 * interestFit
        + 0.15 * roleFit
        + 0.1 * locationFit
        + 0.1 * experienceFit
        + 0.05 * deadlineFit
      ));
      const reasons = [
        `${matchedSkills.length} of ${opportunity.skills.length} listed skills match your profile`,
        matchingInterests.length > 0 ? `Connects with your interest in ${matchingInterests[0]}` : null,
        opportunity.remote ? "Remote work matches a flexible location preference" : null,
        roleFit > 0 ? "This opportunity type fits your current role" : null,
      ].filter((reason): reason is string => Boolean(reason));
      return { opportunity, score, reasons };
    })
    .sort((a, b) => b.score - a.score || a.opportunity.deadline.localeCompare(b.opportunity.deadline));
}

export const applicationTransitions = {
  submitted: ["reviewing", "shortlisted", "rejected", "withdrawn"],
  reviewing: ["shortlisted", "interview", "accepted", "rejected", "withdrawn"],
  shortlisted: ["interview", "accepted", "rejected", "withdrawn"],
  interview: ["accepted", "rejected", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
} as const;

export function canTransitionApplication(
  current: keyof typeof applicationTransitions,
  next: keyof typeof applicationTransitions,
): boolean {
  return (applicationTransitions[current] as readonly string[]).includes(next);
}
