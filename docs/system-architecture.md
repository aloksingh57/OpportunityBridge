# OpportunityBridge system architecture

## Current architecture

```text
Responsive browser / installable web shell
              |
       Next.js App Router
       +------|--------+
       |               |
Server Components   Route Handlers + proxy
       |             validation, authorization,
       |             request IDs, demo rate limits
       +------|--------+
              |
       Local demo adapter -------- local private PDF directory
              |
       Supabase Auth + public.profiles (optional auth pilot only)
```

The application uses Next.js 16 App Router, React, TypeScript, Route Handlers, Zod, and Supabase SSR. Server Components load request-scoped data; sensitive demo API responses use `private, no-store`. The proxy adds correlation IDs and blocks demo APIs in production by default. Demo workflow data and PDF files are local disk resources, not shared cloud storage.

## Organization verification workflow

The local demo adapter stores organizations, owner memberships, verification requests, and an append-only verification audit list in `.data/opportunitybridge.json`. Startup founders and existing-company profiles can submit one jurisdiction-appropriate identifier (CIN, LLPIN, GSTIN, DPIIT, or another supported identifier). Validation checks shape only. A server-key-protected administrator must explicitly approve, reject, request additional information, or expire a verified request. Rejected and information-requested organizations can resubmit; requests and audit entries remain in the local demo store. Verification IDs are returned only to an authorized organization member or the admin bootstrap. Existing-company listings and startup job/internship listings require a verified request on the backend.

This is not a production verification service. There is no evidence-document upload for company verification, organization-member management UI, external verification provider, relational schema, or cross-instance persistence. Seeded organizations are fictional and unverified. Do not enter real identifiers or documents into a publicly hosted demo. The Supabase role migration permits the additional existing-company profile role but does not migrate organization verification records or enable production workflows.

## Platform and operational readiness

| Area | Present in this project | Required before production |
|---|---|---|
| Devices and front end | Responsive web UI, keyboard focus, reduced-motion support, web manifest metadata; custom editorial mountain artwork is CSS/SVG and has no external image dependency | Browser/device accessibility and performance testing; a native iOS/Android app is not included |
| Authentication | Optional Supabase email/password auth; signed local demo identities are development-only | Supply the Supabase public key, apply and verify the profile migration, configure redirect/email policy, recovery, session lifecycle, and integration tests |
| Permissions | Server-side actor/role/ownership checks for demo routes; Supabase profile reads are protected by owner-only RLS | Production policies and authorization tests for every relational workflow and administrative action |
| Backend and APIs | Validated Route Handlers implement local demo workflows; health, auth, contact, opportunity, and document routes exist | Replace the JSON adapter with PostgreSQL-backed service operations and transactionally enforce duplicate, deadline, and state-transition rules |
| Database security | Profile migration enables RLS, grants authenticated users only self-profile reads, and assigns new users the least-privileged student role | Review every table's RLS, grants, indexes, constraints, backup/restore, migration and access-audit strategy before writing production data |
| Rate limiting | Process-local demo limits for mutations and private document traffic | Shared distributed limits at the application or edge layer; per-account and per-IP policy, abuse alerts, and load tests |
| Caching and CDN | Hashed Next.js static assets can be cached by a compatible CDN; authenticated bootstrap responses are private/no-store | Configure a compatible CDN and bypass personalized pages, authentication, and API routes. Preserve Next.js RSC/prefetch cache-key inputs; never cache private responses as public |
| Storage | PDF-only local demo files with randomized names and per-download session authorization | Private object storage, short-lived authorized downloads, malware scanning, lifecycle/retention policies, and restore tests |
| Notifications | Persisted local demo notification records | Durable database events and an explicitly selected email/push provider; delivery, retries, preferences, and consent |
| Logging and error tracking | Request IDs and server console error output; liveness/readiness routes | Centralized structured logs, trace/error provider, secret/PII redaction, alert routes, on-call ownership, and retention policy |
| Monitoring | Health endpoints and a readiness report that fails production readiness | Host/database/storage dashboards, synthetic checks, SLOs, alert thresholds, and incident/restore exercises |
| Hosting | Next.js Node.js server can run on a Node-capable provider; there is no provider account or deployment configuration in this repository | Choose a host/CDN/region, configure secrets and persistent/shared services, and verify deployment-specific Next.js support. No deployment has been provisioned |
| CI/CD | `.github/workflows/ci.yml` runs install, lint, type-check, tests, and build for pushes and pull requests | Add protected branches, deployment environments, secret management, staging integration tests, and gated migrations. This workspace has no Git metadata or remote configured |
| Version control | GitHub Actions workflow is checked in | Initialize/connect a repository and define branch protection/release ownership; no commits, remote, or version history are available in this workspace |
| AI/Claude | Deterministic recommendations; no Claude/Anthropic API configured | If "Claude Hosting" means Claude/Anthropic, select an approved provider, keep credentials server-side, define data handling/consent, and retain deterministic fallback. If it means cloud hosting, use a supported Node.js deployment platform |
| Tests | Node unit tests cover seed data, state transitions, rate limiting, runtime mode, and recommendations; CI includes lint/type-check/build | Supabase/PostgreSQL integration tests, authorization/concurrency tests, browser journeys, accessibility tests, and production deployment smoke checks |

`npm run build` uses Next.js production build output. Use the environment-variable, CDN-caching, and deployment guides that ship with the installed Next.js version when configuring a host. Do not use static export for this app: its authentication, API, authorization, and file workflows require a server runtime.

## Supabase project connection

The project URL supplied for this task is the default URL in `.env.example` and `getSupabaseUrl()`. The application still needs the project's **public anon/publishable key** to make Supabase requests. Set it in `.env.local` for local work or the hosting provider's server-side secret configuration. Never use or expose a service-role key. The URL and public key alone do not enable production opportunity/community workflows; those remain demo-backed and production-disabled.

Review the profile migration before applying it to the supplied project. It is not automatically applied by the app. Do not run destructive migrations or write real user data into the demo JSON store.

## Cache and data boundaries

- Treat all actor-specific pages and API responses as private. `/api/bootstrap` explicitly sends `Cache-Control: private, no-store, max-age=0`.
- Do not add a shared `use cache`/CDN cache to pages that read cookies, profiles, applications, messages, notifications, or other private records.
- CDN caching is suitable for immutable hashed static assets and any deliberately public, non-personalized content only.
- Confirm that a CDN forwards the Next.js RSC and prefetch request details and does not normalize away `_rsc` cache-key inputs. Keep proxy/auth decisions ahead of CDN cache reuse.
- If shared caching, tags, or revalidation are later introduced, test HTML, RSC, prefetch, signed-in, signed-out, and multi-user variants for cache leaks.

## Local configuration and run commands

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Add the project's public key only if testing Supabase Auth; the fictional local demo does not need it.
4. Run `npm run dev`. The app uses a local JSON store under `.data/`.
5. Before deployment, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

The local demo is intended to run on modern phone, tablet, and desktop browsers. It is not an offline-first application and does not create platform-native mobile packages. A persistent local demo file also requires writable disk and one server process; it cannot safely be shared across horizontally scaled instances.
