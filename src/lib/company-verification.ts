import type {
  CompanyVerificationRequest,
  CompanyVerificationStatus,
  RegistrationIdentifierType,
} from "@/types/opportunity-bridge";

export function normalizeRegistrationIdentifier(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function isValidRegistrationIdentifier(
  type: RegistrationIdentifierType,
  value: string,
): boolean {
  const identifier = normalizeRegistrationIdentifier(value);
  if (identifier.length < 3 || identifier.length > 100) return false;

  switch (type) {
    case "cin":
      return /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(identifier);
    case "llpin":
      return /^[A-Z]{3}-?\d{4}$/.test(identifier);
    case "gstin":
      return /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(identifier);
    case "dpiit":
    case "other":
      return /^[A-Z0-9][A-Z0-9./-]{1,98}[A-Z0-9]$/.test(identifier);
  }
}

export function latestVerificationRequest(
  requests: CompanyVerificationRequest[],
  organizationId: string,
): CompanyVerificationRequest | null {
  return requests
    .filter((request) => request.organizationId === organizationId)
    .sort((first, second) => second.submittedAt.localeCompare(first.submittedAt))[0] ?? null;
}

export function verificationStatus(
  requests: CompanyVerificationRequest[],
  organizationId: string,
): CompanyVerificationStatus {
  return latestVerificationRequest(requests, organizationId)?.status ?? "not-submitted";
}

export function canTransitionVerification(
  current: CompanyVerificationStatus,
  next: Exclude<CompanyVerificationStatus, "not-submitted">,
): boolean {
  if (current === "pending-verification") return true;
  return current === "verified" && next === "expired";
}
