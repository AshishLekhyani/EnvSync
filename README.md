# EnvSync

A Doppler/Infisical-style secrets manager: organizations, projects, and environment-scoped secrets, encrypted at rest with AES-256-GCM envelope encryption and gated by role-based access control.

## Features

- **Auth**: email/password (argon2id) or Google OAuth, with real email verification
- **Organizations & RBAC**: OWNER/ADMIN/DEVELOPER/VIEWER roles, a per-org role × environment-tier permission matrix (with sane defaults, overridable per org), plus project-level access control
- **Projects & environments**: DEVELOPMENT/TESTING/STAGING/PRODUCTION tiers per project
- **Secrets**: AES-256-GCM encrypted at rest, full version history with restore, rotation, and optional expiration
- **Audit log**: every mutating action is recorded, paginated, with CSV export and Owner-only retention purge
- **API tokens**: scoped service tokens for CI/CD and the CLI, identity-inheriting and org-scoped
- **Invites**: real emailed invite links (falls back to an in-UI copyable link if no SMTP is configured) to add teammates who don't have an account yet, with a role-based approval workflow
- **Email**: password reset, invites, and signup verification all send real email via SMTP when configured — gracefully falls back to showing the link directly in the UI otherwise
- **Notifications**: in-app alerts for expiring secrets, access requests/grants, and invite decisions
- **CLI**: `login`, `pull`, `push`, `run`, `status`, `projects`, `environments` — zero runtime dependencies
- **Integrations**: copy-paste snippets for GitHub Actions, Docker, Vercel, and AWS Secrets Manager

## Monorepo layout

```
Backend/    Node/Express/Prisma/PostgreSQL API (envsync-api)
Frontend/   Next.js 16 App Router UI (envsync-web)
Cli/        @ashishlekhyani/envsync-cli — the command-line client
```

## Local development

Requires Node >=18 and a local PostgreSQL instance.

1. Copy `Backend/.env.example` to `Backend/.env` and fill in `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `ENCRYPTION_MASTER_KEY` (32 random bytes, base64-encoded, prefixed `base64:`). `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are optional — Google OAuth login is disabled gracefully if unset. `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`EMAIL_FROM` are also optional — without them, password reset/invite/verification links are shown directly in the UI instead of emailed (see the comments in `.env.example` for Gmail/Outlook app-password setup).
2. From `Backend/`: `npx prisma migrate dev` to create the schema.
3. From the repo root:
   - `npm install`
   - `npm run dev:api` — starts the backend on port 4000
   - `npm run dev` — starts the frontend on port 3000
   - `npm run dev:cli` — runs the CLI in watch mode (or `npm run build:cli` then `node Cli/dist/index.js <command>`)

`Backend/scripts/smoke-test.ts` (`npm run smoke-test` from `Backend/`) exercises the full API end-to-end against a running dev server and is the closest thing this project has to an integration test suite.

## Deployment

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for a step-by-step guide to deploying the backend to Railway and the frontend to Vercel.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). For security issues, see [`SECURITY.md`](SECURITY.md) instead of opening a public issue.

## License

MIT — see [`LICENSE`](LICENSE).
