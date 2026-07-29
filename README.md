# EnvSync

A Doppler/Infisical-style secrets manager: organizations, projects, and environment-scoped secrets, encrypted at rest with AES-256-GCM envelope encryption and gated by role-based access control.

## Features

- **Auth**: email/password (argon2id) or GitHub/Google OAuth
- **Organizations & RBAC**: OWNER/ADMIN/DEVELOPER/VIEWER roles, a per-org role × environment-tier permission matrix (with sane defaults, overridable per org)
- **Projects & environments**: DEVELOPMENT/TESTING/STAGING/PRODUCTION tiers per project
- **Secrets**: AES-256-GCM encrypted at rest, full version history with restore, rotation, and optional expiration
- **Audit log**: every mutating action is recorded, with CSV export
- **API tokens**: scoped service tokens for CI/CD and the CLI, identity-inheriting and org-scoped
- **Invites**: shareable invite links to add teammates who don't have an account yet
- **Notifications**: in-app alerts for expiring/expired secrets
- **CLI**: `login`, `pull`, `push`, `run`, `status`, `projects`, `environments` — zero runtime dependencies
- **Integrations**: copy-paste snippets for GitHub Actions, Docker, Vercel, and AWS Secrets Manager

## Monorepo layout

```
Backend/    Node/Express/Prisma/PostgreSQL API (envsync-api)
Frontend/   Next.js 16 App Router UI (envsync-web)
Cli/        envsync-cli — the command-line client
```

## Local development

Requires Node >=18 and a local PostgreSQL instance.

1. Copy `Backend/.env.example` to `Backend/.env` and fill in `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `ENCRYPTION_MASTER_KEY` (32 random bytes, base64-encoded, prefixed `base64:`). `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` and `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are optional — OAuth login is disabled gracefully if unset.
2. From `Backend/`: `npx prisma migrate dev` to create the schema.
3. From the repo root:
   - `npm install`
   - `npm run dev:api` — starts the backend on port 4000
   - `npm run dev` — starts the frontend on port 3000
   - `npm run dev:cli` — runs the CLI in watch mode (or `npm run build:cli` then `node Cli/dist/index.js <command>`)

`Backend/scripts/smoke-test.ts` (`npm run smoke-test` from `Backend/`) exercises the full API end-to-end against a running dev server and is the closest thing this project has to an integration test suite.
