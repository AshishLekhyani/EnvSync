import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, requireOrgRole } from "../rbac/rbac.middleware";
import * as accessRequestController from "./projectAccessRequest.controller";

export const createAccessRequestRouter = Router({ mergeParams: true });
createAccessRequestRouter.use(requireAuth);
createAccessRequestRouter.post(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  accessRequestController.createAccessRequest
);

export const orgAccessRequestsRouter = Router({ mergeParams: true });
orgAccessRequestsRouter.use(requireAuth);
orgAccessRequestsRouter.get(
  "/",
  requireOrgRole("ADMIN", orgIdFromParam()),
  accessRequestController.listAccessRequests
);
orgAccessRequestsRouter.post(
  "/:requestId/approve",
  requireOrgRole("ADMIN", orgIdFromParam()),
  accessRequestController.approveAccessRequest
);
orgAccessRequestsRouter.post(
  "/:requestId/reject",
  requireOrgRole("ADMIN", orgIdFromParam()),
  accessRequestController.rejectAccessRequest
);
