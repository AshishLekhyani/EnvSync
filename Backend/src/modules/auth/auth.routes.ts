import { Router } from "express";
import { validate } from "../../common/validation/validate";
import * as authController from "./auth.controller";
import * as googleController from "./google.controller";
import { requireAuth, requireSessionAuth } from "./auth.middleware";
import { refreshRateLimiter } from "./auth.rateLimit";
import { deleteAccountSchema, updateProfileSchema } from "./auth.validators";

export const authRouter = Router();

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
authRouter.get("/google", googleController.start);
authRouter.get("/google/callback", googleController.callback);
