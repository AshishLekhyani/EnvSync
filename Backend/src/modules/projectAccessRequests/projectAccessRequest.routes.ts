import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, requireOrgRole } from "../rbac/rbac.middleware";
import * as accessRequestController from "./projectAccessRequest.controller";

// Mounted at /api/orgs/:orgId/projects/:projectId/access-requests — creating a
// request deliberately does NOT go through requireProjectAccess, since the
// entire point is requesting access to a project you don't have yet. The
// service enforces the real role gate (canBrowseAllProjects).
export const createAccessRequestRouter = Router({ mergeParams: true });
createAccessRequestRouter.use(requireAuth);
createAccessRequestRouter.post(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  accessRequestController.createAccessRequest
);

// Mounted at /api/orgs/:orgId/project-access-requests
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
