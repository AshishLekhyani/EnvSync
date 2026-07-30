import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { requireOrgRole, orgIdFromParam } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as inviteController from "./invite.controller";
import { inviteAcceptRateLimiter } from "./invite.rateLimit";
import { createInviteSchema, setBlanketAutoApproveSchema } from "./invite.validators";

export const orgInvitesRouter = Router({ mergeParams: true });
orgInvitesRouter.use(requireAuth);

// VIEWER-floor here on purpose: any member can attempt to create an invite,
// but assertCanAssignRole (inside the service) is what actually enforces the
// role hierarchy — a Viewer has nothing assignable and gets 403 there, a
// Developer is restricted to VIEWER-only and routed into the approval flow.
orgInvitesRouter.post(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ body: createInviteSchema }),
  inviteController.createInvite
);
orgInvitesRouter.get(
  "/",
  requireOrgRole("ADMIN", orgIdFromParam()),
  inviteController.listInvites
);
orgInvitesRouter.post(
  "/:inviteId/approve",
  requireOrgRole("ADMIN", orgIdFromParam()),
  inviteController.approveInvite
);
orgInvitesRouter.post(
  "/:inviteId/reject",
  requireOrgRole("ADMIN", orgIdFromParam()),
  inviteController.rejectInvite
);
orgInvitesRouter.get(
  "/auto-approve",
  requireOrgRole("ADMIN", orgIdFromParam()),
  inviteController.listAutoApproveRules
);
orgInvitesRouter.patch(
  "/auto-approve/blanket",
  requireOrgRole("ADMIN", orgIdFromParam()),
  validate({ body: setBlanketAutoApproveSchema }),
  inviteController.setBlanketAutoApprove
);
orgInvitesRouter.post(
  "/auto-approve/:userId",
  requireOrgRole("ADMIN", orgIdFromParam()),
  inviteController.enableInviterAutoApprove
);
orgInvitesRouter.delete(
  "/auto-approve/:userId",
  requireOrgRole("ADMIN", orgIdFromParam()),
  inviteController.disableInviterAutoApprove
);

export const publicInvitesRouter = Router();
publicInvitesRouter.get("/:token", inviteController.getInviteByToken);
publicInvitesRouter.post(
  "/:token/accept",
  inviteAcceptRateLimiter,
  requireAuth,
  inviteController.acceptInvite
);
