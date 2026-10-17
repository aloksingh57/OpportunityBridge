# OpportunityBridge

**Where Opportunity Meets Potential.**  
Discover opportunities. Connect with the right people. Build your future.

OpportunityBridge is a responsive, role-aware professional discovery and collaboration MVP. It brings internships, jobs, projects, scholarships, hackathons, startup funding, mentorship, advisory opportunities, applications, and people discovery into one connected product.

> **Demo-data notice:** This repository starts in local demo mode. Profiles, organizations, opportunity listings, applications, testimonials, notifications, and activity are fictional. They are not verified vacancies, real partnerships, or evidence of platform adoption.

## Get started

### Requirements

- Node.js 22.6 or newer (Node.js 24 LTS recommended)
- npm 10 or newer
- A modern browser

### Windows PowerShell

```powershell
cd "C:\Users\Lenovo\OneDrive\Desktop\hackorbit"
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local data file is created and seeded automatically on first use; no database, email service, or AI key is needed.

### Other development commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the most recent production build. Set a fresh `AUTH_SECRET` in `.env.local` before testing production mode:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

The value printed by this command is a secret: keep it out of source control and logs.

## Demo walkthrough

1. Open the public marketplace and search or combine type, category, skill, location, experience, and remote filters.
2. Choose **Log in** and enter as Aarav Sharma (Student). Save a listing, submit an application, then check its status in Applications.
3. Use the demo-profile selector in the navigation to switch to a recruiter or founder. Publish an opportunity and review its applicant list.
4. Switch to a recipient profile and accept a connection request. From the connected person's profile, start or continue a participant-only conversation.
5. Edit a profile's skills and interests, then visit Recommendations to see deterministic scores and their explanations update.
6. Open Notifications and Settings to review persisted demo activity and reset instructions.
7. `/admin` is a separate, server-key-protected demonstration. Configure `OPPORTUNITYBRIDGE_ADMIN_KEY` in the server environment to enable the admin session form; regular role selection cannot enable it.

All sample names, employers, and activity remain labeled as demos in the interface.

## Included workflows

| Area | Routes | Included behavior |
|---|---|---|
| Public discovery | `/`, `/about`, `/how-it-works`, `/contact` | Product introduction, demo-data disclosure, walkthrough, validated local contact inbox |
| Marketplace | `/opportunities`, `/opportunities/[id]` | Live search, combined filters, sorting, grid/list mode, load-more, details, related listings, save/unsave, application form |
| People | `/people`, `/people/[id]` | Role, skill, interest, and location discovery; public profiles; profile saves; connection requests |
| Demo identity | `/login`, `/register`, `/forgot-password`, `/onboarding` | Switch among fictional roles, create a local demo profile, safe role-only selection, first-run guidance |
| Member space | `/dashboard`, `/profile`, `/settings`, `/saved` | Role-aware dashboard, derived metrics, editable public profile, persisted saved opportunities and profiles |
| Applications | `/applications`, `/applications/[id]`, `/publish`, `/manage-opportunities`, `/manage-applicants` | Apply once before the deadline, publisher review, legal status transitions, private publisher notes, status notifications |
| Network | `/connections`, `/messages`, `/notifications` | Request/accept/decline/cancel/remove connections, messages restricted to conversation participants, persisted notifications and read state |
| Recommendations | `/recommendations` | Deterministic 0–100 discovery estimate with grounded reasons and documented factor weights |
| Administration | `/admin`, `/admin/users`, `/admin/opportunities` | Optional separate server-key session, user/listing moderation, and timestamped audit records |

## Demo data and persistence

The initial fictional dataset contains 18+ people across student, job-seeker, founder, investor, mentor, advisor, and recruiter roles; more than 24 opportunity records; and 20 varied applications. It also includes coherent publishers, connections, conversations/messages, saved opportunities and profiles, and notifications. Listings, profiles, and metrics created through the UI are written to the same local store.

- **Storage:** `.data/opportunitybridge.json` (generated on first request; ignored by Git).
- **Reset:** stop the server and remove only that file; the next request seeds a fresh dataset.

```powershell
Remove-Item -LiteralPath ".data\opportunitybridge.json"
```

The JSON repository serializes writes within one Node.js process and uses atomic file replacement. It is a durable local demonstration adapter—not a multi-process database, production deployment store, or substitute for PostgreSQL constraints. Do not share a writable `.data` file between application instances.

## Configuration and security boundaries

`.env.example` contains placeholders only:

| Variable | Purpose |
|---|---|
| `APP_URL` | Documented local application URL |
| `AUTH_SECRET` | HMAC signing key for HTTP-only demo session cookies; required in production |
| `OPPORTUNITYBRIDGE_ADMIN_KEY` | Optional server-only key that enables a separate admin demo session; no admin role is offered in the public persona selector |

The current login/register experience intentionally provides **demo identity switching**, not production user authentication: it has no password login, identity provider, email verification, or account recovery service. Never expose a demo deployment as a production authentication system. Before production, replace it with an established identity provider and persistent relational database, rotate session secrets, configure HTTPS, and add operational rate limits/monitoring.

Server-side Zod schemas validate API inputs. HMAC-signed, `HttpOnly`, `SameSite=Lax` session cookies identify a chosen demo persona. Ownership and role checks run in route/domain logic—not just in the UI. Applicant notes are excluded from applicant responses; publisher-only notes are shown only to the listing owner or authorized admin. Message reads/sends verify conversation participation. Admin actions require the optional server key and are recorded with actor, target, reason, and timestamp. User-submitted profile and message text is rendered as text, not injected HTML.

No AI, email, payments, calendar, external vacancy feed, or third-party database is configured. Contact messages are saved to the local demo inbox; no email is sent. Local fictional content is not verified and must not be used to make hiring or investment decisions.

## Technical overview

- Next.js App Router, React, TypeScript, Tailwind CSS, Lucide icons, and Zod
- Server Components provide request-scoped, permission-filtered bootstrap data
- Route Handlers implement the local demo session, validated mutations, moderation, and persistence boundary
- CSS-based illustration and motion; `prefers-reduced-motion` is respected
- Node's built-in test runner covers seed integrity, recommendation behavior, and application-state transitions

See [docs/product-brief-mapping.md](./docs/product-brief-mapping.md) for the requirements-to-implementation map and [docs/demo-runbook.md](./docs/demo-runbook.md) for a concise judge walkthrough.
