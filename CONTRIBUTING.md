# Contributing

## Local setup

See [`README.md`](README.md#local-development) for environment setup.

## Project structure

```
Backend/    Node/Express/Prisma/PostgreSQL API (envsync-api)
Frontend/   Next.js 16 App Router UI (envsync-web)
Cli/        @ashishlekhyani/envsync-cli — the command-line client
```

Each workspace follows a validators/service/controller/routes split on the backend, and inline-expand UI (no modals except org creation) on the frontend — match the existing pattern in the module/page you're touching.

## Before opening a PR

1. `npx tsc --noEmit` in whichever workspace(s) you touched.
2. Restart the backend dev server (in-memory rate limiters reset per-process), then `npm run smoke-test` from `Backend/` — it's the closest thing this project has to an integration suite.
3. For frontend changes, click through the affected flow manually — there's no frontend test suite yet.

## Reporting issues

Open a GitHub issue with steps to reproduce. For security issues, please don't open a public issue — see [`SECURITY.md`](SECURITY.md).
