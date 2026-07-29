import { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { UnauthorizedError } from "../../common/errors/AppError";
import { env } from "../../config/env";
import * as authService from "./auth.service";
import { LoginInput, SignupInput } from "./auth.validators";
import { REFRESH_TOKEN_MAX_AGE_MS } from "./tokens";

const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/auth";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: REFRESH_COOKIE_PATH,
  });
}

function sessionMeta(req: Request) {
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
