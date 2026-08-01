import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, requireOrgRole } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as roleChangeRequestController from "./roleChangeRequest.controller";
import { createRoleChangeRequestSchema } from "./roleChangeRequest.validators";
import { roleChangeRequestCreateRateLimiter } from "./roleChangeRequest.rateLimit";

export const orgRoleChangeRequestsRouter = Router({ mergeParams: true });
orgRoleChangeRequestsRouter.use(requireAuth);

orgRoleChangeRequestsRouter.post(
  "/",
  roleChangeRequestCreateRateLimiter,
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ body: createRoleChangeRequestSchema }),
  roleChangeRequestController.createRoleChangeRequest
);
orgRoleChangeRequestsRouter.get(
  "/mine",
  requireOrgRole("VIEWER", orgIdFromParam()),
  roleChangeRequestController.getMyPendingRequest
);
orgRoleChangeRequestsRouter.get(
  "/",
  requireOrgRole("ADMIN", orgIdFromParam()),
  roleChangeRequestController.listRoleChangeRequests
);
orgRoleChangeRequestsRouter.post(
  "/:requestId/approve",
  requireOrgRole("ADMIN", orgIdFromParam()),
  roleChangeRequestController.approveRoleChangeRequest
);
orgRoleChangeRequestsRouter.post(
  "/:requestId/reject",
  requireOrgRole("ADMIN", orgIdFromParam()),
  roleChangeRequestController.rejectRoleChangeRequest
);
