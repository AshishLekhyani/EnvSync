import { Router } from "express";
import { validate } from "../../common/validation/validate";
import * as authController from "./auth.controller";
import { requireAuth } from "./auth.middleware";
import { loginSchema, signupSchema } from "./auth.validators";

export const authRouter = Router();

authRouter.post(
  "/signup",
  validate({ body: signupSchema }),
  authController.signup
);
authRouter.post("/login", validate({ body: loginSchema }), authController.login);
authRouter.post("/refresh", authController.refresh);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", requireAuth, authController.me);
