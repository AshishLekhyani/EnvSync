import { Router } from "express";
import { validate } from "../../common/validation/validate";
import * as authController from "./auth.controller";
import * as githubController from "./github.controller";
import * as googleController from "./google.controller";
import { requireAuth, requireSessionAuth } from "./auth.middleware";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  resetPasswordRateLimiter,
  signupRateLimiter,
} from "./auth.rateLimit";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
} from "./auth.validators";

export const authRouter = Router();

authRouter.post(
  "/signup",
  signupRateLimiter,
  validate({ body: signupSchema }),
  authController.signup
);
authRouter.post(
  "/login",
  loginRateLimiter,
  validate({ body: loginSchema }),
  authController.login
);
authRouter.post("/refresh", refreshRateLimiter, authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
authRouter.patch(
  "/me",
  requireAuth,
  requireSessionAuth,
  validate({ body: updateProfileSchema }),
  authController.updateProfile
);
authRouter.post(
  "/change-password",
  requireAuth,
  requireSessionAuth,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);
authRouter.post(
  "/reset-password",
  resetPasswordRateLimiter,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);
authRouter.delete(
  "/me",
  requireAuth,
  requireSessionAuth,
  validate({ body: deleteAccountSchema }),
  authController.deleteAccount
);
authRouter.get("/sessions", requireAuth, requireSessionAuth, authController.listSessions);
authRouter.delete(
  "/sessions/:sessionId",
  requireAuth,
  requireSessionAuth,
  authController.revokeSession
);
authRouter.get("/events", authController.events);
authRouter.get("/github", githubController.start);
authRouter.get("/github/callback", githubController.callback);
authRouter.get("/google", googleController.start);
authRouter.get("/google/callback", googleController.callback);
