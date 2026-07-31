# EnvSync

A Doppler/Infisical-style secrets manager: organizations, projects, and environment-scoped secrets, encrypted at rest with AES-256-GCM envelope encryption and gated by role-based access control. Real email delivery, a real CLI, and real audit logging — nothing in this app is a mocked-up demo.

Live at [envsync-five.vercel.app](https://envsync-five.vercel.app). CLI published as [`@ashishlekhyani/envsync-cli`](https://www.npmjs.com/package/@ashishlekhyani/envsync-cli).

## Features

**Auth & accounts**
- Email/password (argon2id) or Google OAuth
- Signup requires email verification *before* the account is created — there's no window where an unverified, unusable account sits in the database
- Password reset and email verification send real email via SendGrid's HTTP API when configured, and fall back to showing the link directly in the UI when it isn't (useful for local dev and self-hosters who skip email setup)
- Short-lived JWT access tokens + rotating opaque refresh tokens (httpOnly cookie); revoking a session takes effect immediately across every open tab via a live SSE push, not on next reload
- Account deletion, with a solo-ownership check that blocks deleting an account that would silently orphan an organization

**Organizations, roles & access**
- Four-role hierarchy: OWNER > ADMIN > DEVELOPER > VIEWER
- A configurable role × environment-tier permission matrix (sane defaults, overridable per org) governing read/write access to DEVELOPMENT / TESTING / STAGING / PRODUCTION independently
- Project-level access control layered on top: who can even *see* a project is a separate gate from what they can do inside one they can see. Owner always sees everything; everyone else needs an explicit grant or an org-wide "view all projects" override
- Admins/Developers without access to a project can still browse the full project list and request access; an Admin who already has access approves or rejects
- Self-service: any member can leave an organization or a specific project on their own, no admin required
- Direct, immediate ownership transfer (Owner-only)
- Role assignment (via invite or promotion) is capped strictly below the assigner's own role — a Developer can only ever grant Viewer, an Admin can never grant Admin or Owner

**Invites**
- Shareable invite links, optionally scoped to a specific project, emailed automatically when email sending is configured
- Invites created by a Developer require Admin approval before they're usable, unless an auto-approve rule exists (per-developer or org-wide)
- A live notification tells the requester when their invite or access request is approved/rejected

**Secrets**
- AES-256-GCM envelope encryption: each org has its own Data Encryption Key, wrapped by a single server-held master key — rotating the master key never requires re-encrypting secret data
- Full version history with restore, rotation (server-generated random values), and optional expiration with proactive notifications before/at expiry
- Bulk upsert for CLI `push`
- Every reveal is freshly audited server-side, never served from a client-side cache

**Audit log**
- Every mutating action and every secret reveal is recorded: who, what, when, from where
- Filterable by project, action type, actor, and date range; paginated at 40/page
- CSV export; Owner-only permanent purge of entries older than a chosen date (itself audited)

**API tokens & CLI**
- Scoped service tokens, identity-inheriting (a token can only ever do what its creator can do) and hard-locked to the org it was issued for
- Zero-runtime-dependency CLI: `login`, `logout`, `projects`, `environments`, `pull`, `push`, `run`, `status` — reads a token from stdin or `ENVSYNC_TOKEN` for CI use
- CLI and browser share the exact same RBAC/audit code path — a `pull` is audited identically to a manual reveal

**Everything else**
- Live in-app notifications (SSE-pushed, no polling) for access requests/grants, invite decisions, and expiring secrets
- Real confirmation modals everywhere (no native browser `confirm()`/`alert()`)
- Copy-paste integration snippets for GitHub Actions, Docker, Vercel, and AWS Secrets Manager — no live third-party connections, just real generated config
- A public `/docs` section (getting started, CLI reference, security model, roles & permissions, API tokens, integrations) that's factually accurate to what's actually built, not marketing copy

## How it works

- **Encryption**: AES-256-GCM (authenticated, tamper-evident). Master key wraps per-org DEKs; DEKs encrypt secret values. Server-side, not zero-knowledge — the server decrypts after an RBAC check, same trust model as Doppler/Infisical. Full detail at `/docs/security`.
- **Access control**: every request (browser JWT or CLI API token) resolves to a live role check against current org membership, project membership, and the environment-tier matrix — nothing is cached on a token. Full detail at `/docs/permissions`.
- **Real-time**: a single per-user SSE connection (`GET /api/auth/events`) pushes session revocation, access changes, and new notifications to every open tab instantly.

## Monorepo layout

```
Backend/    Node/Express/Prisma/PostgreSQL API (envsync-api)
Frontend/   Next.js 16 App Router UI (envsync-web)
Cli/        @ashishlekhyani/envsync-cli — the command-line client
```

## Local development

Requires Node ≥18 and a local PostgreSQL instance (or a free [Neon](https://neon.tech) database — no local Postgres install needed).

1. Copy `Backend/.env.example` to `Backend/.env` and fill in the required variables (see table below).
2. From `Backend/`: `npx prisma migrate dev` to create the schema.
3. From the repo root:
   - `npm install`
   - `npm run dev:api` — starts the backend on port 4000
   - `npm run dev` — starts the frontend on port 3000 (reads `NEXT_PUBLIC_API_URL` from `Frontend/.env.local`; defaults to `http://localhost:4000/api` if unset)
   - `npm run dev:cli` — runs the CLI in watch mode (or `npm run build:cli` then `node Cli/dist/index.js <command>`)

### Environment variables (`Backend/.env`)

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | Required | Postgres connection string |
| `JWT_ACCESS_SECRET` | Required | Signs access tokens — long random string |
| `ENCRYPTION_MASTER_KEY` | Required | `base64:` + 32 random bytes — wraps per-org secret-encryption keys |
| `PORT` | Optional (default `4000`) | API listen port |
| `NODE_ENV` | Optional (default `development`) | `production` enables secure cookies, stricter behavior |
| `CORS_ORIGIN` | Required | The frontend's origin — must match exactly for cookies/CORS to work |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth login — the button is hidden gracefully if unset |
| `SENDGRID_API_KEY` / `EMAIL_FROM` | Optional | Real email delivery for password reset/invites/verification via SendGrid's HTTP API — falls back to showing the link in the UI if unset (see `.env.example` for single-sender-verification setup) |

### Verification

`Backend/scripts/smoke-test.ts` (`npm run smoke-test` from `Backend/`) exercises the full API end-to-end against a running dev server and is the closest thing this project has to an integration test suite — 260+ assertions covering auth, RBAC, encryption round-trips, invites, audit logs, rate limiting, and more. It needs email sending left **unconfigured** locally (it reads dev-mode tokens back from API responses) and a fresh backend restart between runs (in-memory rate limiters persist per-process).

## Docs

The in-app `/docs` section is the primary reference for how the product actually works: [Getting Started](https://envsync-five.vercel.app/docs/getting-started), [CLI Reference](https://envsync-five.vercel.app/docs/cli), [Security & Encryption](https://envsync-five.vercel.app/docs/security), [Roles & Permissions](https://envsync-five.vercel.app/docs/permissions), [API Tokens](https://envsync-five.vercel.app/docs/api-tokens), [Integrations](https://envsync-five.vercel.app/docs/integrations).

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the actual production setup this project runs on: backend on Render, database on Neon, frontend on Vercel — no Docker needed.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). For security issues, see [`SECURITY.md`](SECURITY.md) instead of opening a public issue.

## License

MIT — see [`LICENSE`](LICENSE).
