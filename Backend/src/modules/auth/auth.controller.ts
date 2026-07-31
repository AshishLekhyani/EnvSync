import { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import { UnauthorizedError } from "../../common/errors/AppError";
import { env } from "../../config/env";
import * as authService from "./auth.service";
import {
  ChangePasswordInput,
  DeleteAccountInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from "./auth.validators";
import { REFRESH_TOKEN_MAX_AGE_MS } from "./tokens";
import { registerConnection, unregisterConnection } from "./sse";

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
  const data = await authService.getMe(req.user!.id, req.apiTokenOrgId);
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

export const events = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) {
    throw new UnauthorizedError();
  }

  const session = await authService.findSessionByRefreshToken(raw);
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new UnauthorizedError();
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");

  registerConnection(session.userId, res);

  const cleanup = () => {
    clearInterval(heartbeat);
    unregisterConnection(session.userId, res);
  };

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      cleanup();
    }
  }, 20000);

  res.on("error", cleanup);
  req.on("close", cleanup);
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

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body as ForgotPasswordInput);
  res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body as ResetPasswordInput);
  res.status(204).send();
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user!.id, req.body as DeleteAccountInput);
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  res.status(204).send();
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail((req.body as VerifyEmailInput).token);
  res.status(204).send();
});

export const resendVerification = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.user!.id);
  res.status(200).json(result);
});
