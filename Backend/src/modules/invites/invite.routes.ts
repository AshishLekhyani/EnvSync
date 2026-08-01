import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { requireOrgRole, orgIdFromParam } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as inviteController from "./invite.controller";
import { inviteAcceptRateLimiter, inviteCreateRateLimiter } from "./invite.rateLimit";
import { createInviteSchema } from "./invite.validators";

export const orgInvitesRouter = Router({ mergeParams: true });
orgInvitesRouter.use(requireAuth);

orgInvitesRouter.post(
  "/",
  inviteCreateRateLimiter,
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ body: createInviteSchema }),
  inviteController.createInvite
);
orgInvitesRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  inviteController.listInvites
);

export const publicInvitesRouter = Router();
publicInvitesRouter.get("/:token", inviteController.getInviteByToken);
publicInvitesRouter.post(
  "/:token/accept",
  inviteAcceptRateLimiter,
  requireAuth,
  inviteController.acceptInvite
);
