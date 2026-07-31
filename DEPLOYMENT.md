# Deploying EnvSync

This guide covers the recommended setup: **backend on Railway** (API + Postgres), **frontend on Vercel**. No Docker is required for this path — both platforms build directly from the GitHub repo. See "Why not Docker?" at the bottom if you're curious when it *would* matter.

## Prerequisites

- The repo pushed to GitHub (public or private, either works)
- A [Railway](https://railway.app) account
- A [Vercel](https://vercel.com) account
- An SMTP account for real password-reset/invite/verification emails (a personal Gmail or Outlook account works — see `Backend/.env.example` for app-password setup notes). Optional: without it, those flows fall back to showing the link directly in the UI instead of emailing it.

## 1. Backend → Railway

1. **New Project → Deploy from GitHub repo** → select this repo.
2. Set the service's **root directory** to `Backend`.
3. **Add a Postgres plugin** to the project (Railway auto-populates `DATABASE_URL` on the backend service — reference it via a variable, don't hardcode).
4. **Build command**: `npm install && npm run build`
   **Start command**: `npm run start`
5. **Deploy-time migration**: add a **Deploy** (or "release") command running `npx prisma migrate deploy` before the start command — this applies migrations non-interactively, unlike `migrate dev`. Railway's "Custom Start Command" can chain both: `npx prisma migrate deploy && npm run start`.
6. Set environment variables (Railway → Variables):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Reference the Postgres plugin's variable |
   | `JWT_ACCESS_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
   | `ENCRYPTION_MASTER_KEY` | `base64:` + `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Vercel URL — fill this in **after** step 2 below, then redeploy |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | your SMTP provider's values |
   | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | optional, if enabling GitHub login |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional, if enabling Google login |

   `PORT` doesn't need to be set — Railway injects it and `Backend/src/index.ts` already listens on `env.PORT`.
7. Deploy. Note the resulting public URL (e.g. `https://envsync-api-production.up.railway.app`).

## 2. Frontend → Vercel

1. **Import Project** from the same GitHub repo.
2. Set the project's **root directory** to `Frontend`.
3. Environment variable:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-railway-domain>/api` |

4. Deploy. Note the resulting URL (e.g. `https://envsync.vercel.app`).

## 3. Close the loop

Go back to Railway and set the backend's `CORS_ORIGIN` to the Vercel URL from step 2, then redeploy the backend. Cookies and CORS won't work correctly until this matches exactly (no trailing slash).

## 4. Post-deploy checklist

- Sign up with a real email → confirm the verification email arrives and the link works
- Use "Forgot password" → confirm the reset email arrives and the link works
- Invite a teammate → confirm the invite email arrives
- If OAuth is configured, confirm the GitHub/Google login buttons work
- `curl -I https://<your-vercel-domain>` → confirm security headers are present (`X-Frame-Options`, `Content-Security-Policy`, etc.)
- **Do not** run `Backend/scripts/smoke-test.ts` against production — it freely creates throwaway orgs, users, and secrets. Keep it to local/dev/staging.

## Why not Docker?

Docker packages an app with its exact runtime so it runs identically anywhere — mainly valuable when **self-hosting** on a bare VPS or your own server, where you'd otherwise have to manually match Node/Postgres versions yourself. Railway and Vercel both build directly from source and manage the runtime for you, so Docker adds no value on this path. It would matter if you later move to self-hosting instead — that's a fair to revisit then, not now.
