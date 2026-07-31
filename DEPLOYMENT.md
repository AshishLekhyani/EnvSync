# Deploying EnvSync

This is the actual setup this project runs on: **backend on Render** (API), **database on Neon** (Postgres), **frontend on Vercel**. No Docker is required for this path — all three platforms build directly from the GitHub repo. See "Why not Docker?" at the bottom if you're curious when it *would* matter.

## Prerequisites

- The repo pushed to GitHub (public or private, either works)
- A [Neon](https://neon.tech) account (free Postgres)
- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- A [SendGrid](https://sendgrid.com) account for real password-reset/invite/verification emails (free tier, 100/day). Sent via SendGrid's HTTP API, not SMTP — Render (and many hosts) block outbound SMTP ports, so raw SMTP doesn't work here. Verify a single sender email under Settings → Sender Authentication → Single Sender Verification (no domain required), then create a restricted API key with only "Mail Send" permission. Optional: without it, those flows fall back to showing the link directly in the UI instead of emailing it.
- If you want Google sign-in, a Google Cloud OAuth Client (optional — the button is hidden gracefully if unset).

## 1. Database → Neon

1. **New Project** → name it → pick any region → **Create Project**.
2. Copy the **direct** connection string (not the one with `-pooler` in the hostname — this backend is one steady long-running server, not serverless functions, so it doesn't need connection pooling, and pooling has a known rough edge with Prisma's migration engine).

## 2. Backend → Render

1. **New +** → **Web Service** → connect the GitHub repo.
2. Fill in:
   - **Root Directory**: `Backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install --include=dev && npm run build`
     (`--include=dev` matters: `NODE_ENV=production` — set below — makes plain `npm install` skip devDependencies, but `typescript`/`@types/*`/`prisma` are all devDependencies the build itself needs.)
   - **Start Command**: `npx prisma migrate deploy && npm run start`
     (`&&`, not `;` — if migrations fail, the server should not start against a schema it doesn't match.)
3. Environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Neon direct connection string from step 1 |
   | `JWT_ACCESS_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
   | `ENCRYPTION_MASTER_KEY` | `base64:` + `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | your Vercel URL — fill this in **after** step 3 below, then redeploy |
   | `SENDGRID_API_KEY` / `EMAIL_FROM` | your SendGrid API key and the verified sender address, e.g. `EnvSync <you@example.com>` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional, if enabling Google login |

   `PORT` doesn't need to be set — Render injects it and `Backend/src/index.ts` already listens on `env.PORT`.
4. Deploy. Note the resulting URL (e.g. `https://envsync-api.onrender.com`).

**Free-tier cold starts**: Render spins the service down after ~15 minutes idle. The first request after that takes ~30-50s to wake back up — the frontend shows a branded "Waking up the server..." screen for this rather than looking broken, and retries instead of treating it as a sign-out. A paid instance removes the delay entirely if it ever matters.

## 3. Frontend → Vercel

1. **Import Project** from the same GitHub repo.
2. Set the project's **root directory** to `Frontend`.
3. Environment variable:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-render-domain>/api` |

4. Deploy. Note the resulting URL (e.g. `https://envsync.vercel.app`).

## 4. Close the loop

Go back to Render and set the backend's `CORS_ORIGIN` to the Vercel URL from step 3, then redeploy the backend. Cookies and CORS won't work correctly until this matches exactly (no trailing slash).

## 5. Post-deploy checklist

- Sign up with a real email → confirm the verification email arrives and clicking it actually creates the account (no account exists until verified)
- Use "Forgot password" → confirm the reset email arrives and the link works
- Invite a teammate → confirm the invite email arrives
- If Google OAuth is configured, confirm the button works
- `curl -I https://<your-vercel-domain>` → confirm security headers are present (`X-Frame-Options`, `Content-Security-Policy`, etc.)
- **Do not** run `Backend/scripts/smoke-test.ts` against production — it freely creates throwaway orgs, users, and secrets, and requires email sending to be *unconfigured* to read back dev-mode tokens. Keep it to local dev only.

## Why not Docker?

Docker packages an app with its exact runtime so it runs identically anywhere — mainly valuable when **self-hosting** on a bare VPS or your own server, where you'd otherwise have to manually match Node/Postgres versions yourself. Render, Vercel, and Neon all build directly from source or manage the runtime for you, so Docker adds no value on this path. It would matter if you later move to self-hosting instead.
