# OpportunityBridge brief → implementation map

This project was implemented from the OpportunityBridge Product Brief and Remaining Implementation Details. The fictional seed records and local demo mode are explicit; this file maps the specification to the current MVP and records its boundaries.

## Product, design, and experience

- **Product promise:** “Where Opportunity Meets Potential”; discover opportunities, connect with people, build a future.
- **Audience:** students, job seekers, founders, investors, mentors, advisors, and recruiters.
- **Visual language:** warm ivory, lavender, sky, mint, blush, ink, rounded cards, soft depth, lightweight CSS motion, and responsive layouts.
- **Accessible interaction:** semantic links and forms, labels, visible focus, touch-friendly controls, live feedback, narrow-screen layouts, and `prefers-reduced-motion`.
- **Honest demo mode:** a persistent notice explains that fictional people, organizations, opportunities, testimonials, counts, and activity are sample data.

## Routes and product journeys

The shared optional catch-all App Router page implements public pages (`/`, `/about`, `/opportunities`, `/opportunities/[id]`, `/startups`, `/people`, `/people/[id]`, `/login`, `/register`, `/forgot-password`, `/how-it-works`, `/contact`), member pages (`/onboarding`, `/dashboard`, `/profile`, `/settings`, `/notifications`, `/messages`, `/connections`, `/sessions`, `/saved`, `/applications`, `/applications/[id]`, `/publish`, `/manage-opportunities`, `/manage-applicants`, `/recommendations`), and restricted admin pages (`/admin`, `/admin/users`, `/admin/opportunities`). Private member paths redirect to sign-in when no valid demo session is present. Admin pages have a separate server-key gate.

The marketplace filters public, non-expired published listings by query, type, category, skill, location, experience, and remote setting; sorts by fit, recency, deadline, or compensation; toggles grid/list views; and has load-more and recovery states. Opportunity details include responsibilities, eligibility, skills, publisher profile, compensation, deadline, save, apply, and related listings.

Users can activate multiple roles per account; each protected mutation checks memberships on the server while a primary role supplies a dashboard default. Students/job seekers can submit one application before its deadline and withdraw while the transition is valid. Publishers manage their own listings, review only their applicants, transition application statuses, write private publisher notes, and notify applicants. Investor discovery filters fictional startup records by industry and stage. Mentors/advisors receive private session requests, control accept/decline/complete transitions, and can review CV/pitch PDFs only after accepting. PDF uploads are size/type/signature checked, stored under randomized non-public local paths, and downloaded only by the requester or an accepted provider; they are never included in public bootstrap data. Connections enforce no-self and no-duplicate-active-request rules, recipient-only accept/decline, and requester-only cancel. Blocking suppresses the relationship from discovery and prevents messaging/session access. Users can submit one open content report per target; only the admin bootstrap exposes reports and only admins can review them. Message read/send operations verify conversation membership. Notifications persist and are owner-scoped. Contact form entries persist locally with a clear statement that no email was sent.

The role-aware `/dashboard` has switchable views for all active account roles. Student/job-seeker dashboards show application status counts and personalized opportunities; founder/recruiter dashboards show a filterable applicant pipeline and listing counts/deadlines; investor dashboards show fictional startups, founder links, and published funding opportunities; mentor/advisor dashboards show pending requests with accept actions and accepted sessions. Admins have a separate server-key-gated overview for reports, moderation history, and contact submissions. Dashboard metrics are computed from visible local records; they are not invented activity analytics.

## Demo relationships and discovery

- Fictional users are seeded across all seven discoverable roles.
- Multiple role memberships, three fictional startup profiles, and founder links are validated by tests.
- More than 24 opportunity records cover internships, full-time/part-time work, freelance projects, student projects, scholarships, hackathons, startup funding, mentorship, and advisory.
- Twenty varied sample applications reference existing users and opportunities; seeded saves, connections, messages, and notifications reference valid records.
- Dashboard metrics are derived from store relationships.
- Recommendations are deterministic: 40% skills, 20% interest/category, 15% role compatibility, 10% location/remote, 10% experience, and 5% deadline. Reasons come from those same factors; the score is not an employment prediction.

## Technical and trust boundaries

- **Current adapter:** local JSON file, one process, serialized server-side mutations, atomic replacement, and generated seed data. This satisfies a local demo without provisioning a database; it is not a production database.
- **Identity:** signed HTTP-only demo session cookies and an explicit persona selector. There is no production password login, OAuth/SSO, email verification, or account recovery.
- **Authorization:** API/domain ownership checks protect applications, listings, profiles, connections, messages, private session documents, reports, and admin moderation. Role membership is checked on each protected action. The role selector cannot select an administrator; admin sessions require the server-only `OPPORTUNITYBRIDGE_ADMIN_KEY`.
- **Validation and abuse controls:** Zod schemas on server mutations, bounded user inputs, state transition checks, duplicate application guard, deadline guard, and process-local per-account limits for actions and private file transfers. These limits reset with the process and are not distributed production protection.
- **External integrations:** none configured. No live vacancy feed, AI ranking service, email, payments, calendar, cloud file storage, or managed database is claimed. The startup/opportunity catalogue is local seed data; no third-party data source is presented as live.
- **Production follow-up:** use a trusted identity provider, PostgreSQL/Prisma (or equivalent) with unique/foreign-key constraints and transactions, deploy on persistent infrastructure, configure HTTPS and secrets, replace process-local limits with shared operational rate limiting, and add browser-driven end-to-end tests.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. See the README for exact commands, demo setup, persistence/reset behavior, and known limitations. A build or test status must be reported only after the corresponding command has actually completed.
