<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OpportunityBridge — Agent Instructions

## Mission
Build a runnable, responsive professional discovery and collaboration platform for students, job seekers, founders, recruiters, investors, mentors, and advisors.

## Working rules
1. Inspect the repository and preserve useful work before editing.
2. Build complete working journeys, not disconnected mockups.
3. Use TypeScript, semantic accessible React components, and validated inputs.
4. Make every visible control functional and communicate failures honestly.
5. Label fictional demo data, metrics, organizations, and testimonials clearly.
6. Keep secrets server-side; never commit `.env.local`.
7. Enforce authentication, ownership, permissions, and state transitions on the server.
8. Keep applicant notes private and conversation reads/sends participant-only.
9. Use deterministic recommendations when no AI provider is configured.
10. Add loading, empty, validation, permission-denied, and error states.
11. Run lint, type-check, build, and relevant tests; report only checks actually run.
12. Document demo-mode limitations and production requirements.

## Product requirements
- Public pages: home, about, how it works, opportunities/details, people, login/register/recovery, and contact.
- Member pages: onboarding, multi-role dashboard, profile/settings, notifications, messages, connections, mentoring/advisory sessions, saved items, applications/details, publishing, applicant management, and recommendations.
- Restricted admin overview, user moderation, and opportunity moderation.
- Investor startup discovery filtered by industry and stage.
- Role-specific dashboard views for students/job seekers, founders/recruiters, investors, mentors/advisors, and restricted admins; dashboard metrics must derive from visible persisted records.
- Session-only PDF attachments for CV/pitch review, with requester/provider access checks on every download.
- User reports and blocks with private admin review; demo identities must never be represented as truly verified.
- Search/filter/sort opportunities; persist saves, applications, connections, messages, notifications, profiles, and moderation records.
- Seed coherent fictional profiles, listings, applications, and relationships.
- Prevent duplicate/late applications and invalid role/state changes.
- Explain recommendation scores with grounded features and visible demo caveats.
- Responsive UI, keyboard focus, reduced-motion support, meaningful empty/error states.
- Missing infrastructure must not crash demo mode or be described as configured.

## Definition of done
- Documented local run commands work.
- Main routes render and the primary product journeys perform real server-side mutations.
- Demo/live distinctions and production gaps are explicit.
- Relevant automated checks are executed and their actual results reported.
