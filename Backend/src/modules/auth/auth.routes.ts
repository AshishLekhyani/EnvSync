import { Router } from "express";
import { validate } from "../../common/validation/validate";
import * as authController from "./auth.controller";
import * as githubController from "./github.controller";
import * as googleController from "./google.controller";
import { requireAuth } from "./auth.middleware";
import { loginRateLimiter, signupRateLimiter } from "./auth.rateLimit";
import { loginSchema, signupSchema } from "./auth.validators";

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
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
authRouter.get("/sessions", requireAuth, authController.listSessions);
authRouter.delete("/sessions/:sessionId", requireAuth, authController.revokeSession);
authRouter.get("/github", githubController.start);
authRouter.get("/github/callback", githubController.callback);
authRouter.get("/google", googleController.start);
authRouter.get("/google/callback", googleController.callback);
