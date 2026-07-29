import { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { UnauthorizedError } from "../../common/errors/AppError";
import { env } from "../../config/env";
import * as authService from "./auth.service";
import { ChangePasswordInput, LoginInput, SignupInput, UpdateProfileInput } from "./auth.validators";
import { REFRESH_TOKEN_MAX_AGE_MS } from "./tokens";

export const REFRESH_COOKIE = "refreshToken";
export const REFRESH_COOKIE_PATH = "/api/auth";

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: REFRESH_COOKIE_PATH,
  });
}

export function sessionMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

export const signup = asyncHandler(async (req, res) => {
  const user = await authService.signup(req.body as SignupInput);
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(
    req.body as LoginInput,
    sessionMeta(req)
  );
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ user, accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];

  if (!raw) {
    throw new UnauthorizedError("Missing refresh token");
  }

  const { user, accessToken, refreshToken } = await authService.refresh(
    raw,
    sessionMeta(req)
  );
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ user, accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];

  if (raw) {
    await authService.logout(raw);
  }

  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  const data = await authService.getMe(req.user!.id);
  res.status(200).json(data);
});

export const listSessions = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  const sessions = await authService.listSessions(req.user!.id, raw);
  res.status(200).json(sessions);
});

export const revokeSession = asyncHandler(async (req, res) => {
  await authService.revokeSession(req.user!.id, req.params.sessionId);
  res.status(204).send();
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
  res.status(200).json(user);
});

export const changePassword = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  const currentSession = raw ? await authService.findSessionByRefreshToken(raw) : null;
  await authService.changePassword(
    req.user!.id,
    req.body as ChangePasswordInput,
    currentSession?.id
  );
  res.status(204).send();
});
