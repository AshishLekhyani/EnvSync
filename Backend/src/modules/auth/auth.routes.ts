import { Router } from "express";
import { validate } from "../../common/validation/validate";
import * as authController from "./auth.controller";
import * as googleController from "./google.controller";
import { requireAuth, requireSessionAuth } from "./auth.middleware";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  resendVerificationRateLimiter,
  resetPasswordRateLimiter,
  signupRateLimiter,
  verifyEmailRateLimiter,
} from "./auth.rateLimit";
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  resendSignupVerificationSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  verifyEmailSchema,
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
authRouter.post(
  "/verify-email",
  verifyEmailRateLimiter,
  validate({ body: verifyEmailSchema }),
  authController.verifyEmail
);
authRouter.post(
  "/resend-verification",
  resendVerificationRateLimiter,
  validate({ body: resendSignupVerificationSchema }),
  authController.resendVerification
);
authRouter.get("/google", googleController.start);
authRouter.get("/google/callback", googleController.callback);
