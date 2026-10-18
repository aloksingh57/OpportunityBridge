# OpportunityBridge operations runbook

## Runtime modes

- **Local development:** `npm run dev` enables the clearly labelled fictional demo automatically.
- **Production:** `NODE_ENV=production` disables demo APIs and presents a setup notice unless `OPPORTUNITYBRIDGE_ENABLE_DEMO=true` is deliberately set. With a valid HTTPS Supabase URL and public key, only `/login`, `/register`, and the Supabase auth APIs are enabled. This is an authentication/profile pilot; opportunity and community APIs remain disabled.
- The application still has no complete production relational data adapter, shared rate limiter, production object-storage integration, or account recovery flow. `/api/health/ready` reports these blockers and sets `productionReady` to `false`. Do not route real opportunity or community activity to this build.

## Optional Supabase account pilot

1. Create or select the intended Supabase project and confirm its owner/environment before applying schema changes.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the server environment. A legacy `SUPABASE_ANON_KEY` is accepted as an alternative. The application does not use a service-role key.
3. Apply `supabase/migrations/20260617000000_create_authenticated_profiles.sql` to that project through its reviewed migration workflow. It creates the profile table, self-read RLS policy, and new-auth-user trigger; it does not migrate demo opportunities, applications, messages, or other records.
4. Configure the Supabase Auth site URL, allowed redirect URL, email-confirmation policy, and a production SMTP provider. Test creation, email verification, sign-in, sign-out, and session expiry with isolated test accounts.
5. Verify `/api/health/ready` still reports `productionReady: false`. Authentication does not unlock demo-backed product workflows.

Registration does not accept a requested role. The database trigger assigns new users the `student` role; privileged or trust-sensitive role assignment requires a separate verified server-side workflow.

## Start and verify a local demo

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Check:

```powershell
Invoke-WebRequest http://localhost:3000/api/health/live
Invoke-WebRequest http://localhost:3000/api/health/ready
```

The liveness endpoint indicates that the process can answer requests. Readiness describes the configured mode; a ready demo is not a production-ready service. API responses include an `X-Request-ID` for request correlation.

## Production release gate

Do not deploy as a production application until all items below have owners and passing evidence:

1. Complete the Supabase account lifecycle with verified callback URLs, password recovery, session expiry/revocation, and an audited server-controlled role-verification workflow.
2. Implement a normalized PostgreSQL schema and checked-in migrations, transactions, unique constraints, indexes, migration-upgrade tests, and a safe production datastore adapter.
3. Migrate all authenticated and public discovery workflows away from the JSON demo store; production must fail closed if the database is unavailable.
4. Configure a shared rate limiter, log/trace collection, alert ownership, private object storage, malware scanning, retention, and recovery procedures.
5. Exercise authorization, guessed IDs, concurrency, malformed requests, and the full browser journey in CI against isolated test data.
6. Perform a security/accessibility review, validate HTTPS and a tailored Content Security Policy, and rehearse incident response and restore.
7. Run the requirements-to-evidence gate in [implementation-acceptance-matrix.md](./implementation-acceptance-matrix.md).

The production dependency audit is currently clean. The full `npm audit` reports five high-severity findings in the development-only `eslint-config-next@16.4.2` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces@3.0.3` chain. The registry does not publish the advisory's `braces@3.0.4` fix yet; npm's only offered alternative downgrades the Next.js ESLint config to 14.2.35. Do not force that incompatible downgrade; recheck for an upstream patch before release.

Never set `OPPORTUNITYBRIDGE_ENABLE_DEMO=true` to satisfy the production release gate. That setting is suitable only for an explicitly labelled demo deployment with no real user data.

## Demo data and recovery

The local adapter stores records in `.data/opportunitybridge.json` and private PDF samples under `.data/private-documents/`. Keep both paths out of Git and restrict access to the machine running the demo. These are not production backups. For demo-only recovery, stop the server, copy the JSON file and required private files to a protected backup location, and verify restoration in a separate local workspace. Do not reset or overwrite user data without an explicit backup and approval.

## Secrets and incident handling

- Keep `.env.local` and deployment secrets out of source control and logs.
- `AUTH_SECRET` is needed only if production demo sessions are deliberately enabled; it is not used for Supabase sessions and does not provide real authentication by itself.
- Rotating `AUTH_SECRET` invalidates existing demo cookies. Rotating `OPPORTUNITYBRIDGE_ADMIN_KEY` revokes access to the demo admin flow.
- If a private local PDF is exposed, restrict access to the host, preserve relevant request IDs and server logs, remove the specific exposed file after evidence preservation, and assess any required notification. Automated malware scanning and retention enforcement are not implemented.
- Capture request ID, time, route, and sanitized symptoms when escalating; do not include credentials, private messages, or document contents.

## Rollback

There is no production migration or deployment path to roll back yet. For local code changes, return to the last known-good build using the repository's normal version-control process. Preserve `.data/` and private files; never delete them as part of a code rollback.
