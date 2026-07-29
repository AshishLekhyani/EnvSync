import crypto from "node:crypto";
import { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { env } from "../../config/env";
import * as githubService from "./github.service";
import { issueSession } from "./auth.service";
import { setRefreshCookie, sessionMeta } from "./auth.controller";
import { ConflictError } from "../../common/errors/AppError";

const OAUTH_STATE_COOKIE = "githubOauthState";
const OAUTH_STATE_COOKIE_PATH = "/api/auth/github";

function frontendUrl(path: string): string {
  return `${env.CORS_ORIGIN.replace(/\/$/, "")}${path}`;
}

function redirectUri(req: Request): string {
  return `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
}

export const start = asyncHandler(async (req, res) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return res.redirect(frontendUrl("/login?error=oauth_not_configured"));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const invite = typeof req.query.invite === "string" ? req.query.invite : undefined;

  res.cookie(OAUTH_STATE_COOKIE, JSON.stringify({ state, invite }), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: OAUTH_STATE_COOKIE_PATH,
  });

  res.redirect(githubService.getAuthorizeUrl(state, redirectUri(req)));
});

export const callback = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: OAUTH_STATE_COOKIE_PATH });

  if (req.query.error) {
    return res.redirect(frontendUrl("/login?error=oauth_denied"));
  }

  let parsed: { state?: string; invite?: string } = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  if (!parsed.state || parsed.state !== req.query.state) {
    return res.redirect(frontendUrl("/login?error=state_mismatch"));
  }

  const code = req.query.code;
  if (typeof code !== "string") {
    return res.redirect(frontendUrl("/login?error=oauth_failed"));
  }

  try {
    const accessToken = await githubService.exchangeCodeForToken(code, redirectUri(req));
    const profile = await githubService.fetchGithubProfile(accessToken);
    const user = await githubService.findOrCreateGithubUser(profile);

    const { refreshToken } = await issueSession(user.id, user.email, sessionMeta(req));
    setRefreshCookie(res, refreshToken);

    const destination = parsed.invite ? `/invite/${parsed.invite}` : "/projects";
    return res.redirect(frontendUrl(destination));
  } catch (err) {
    if (err instanceof ConflictError) {
      return res.redirect(frontendUrl("/login?error=email_in_use"));
    }
    return res.redirect(frontendUrl("/login?error=oauth_failed"));
  }
});
