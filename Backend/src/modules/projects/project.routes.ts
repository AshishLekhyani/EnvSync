import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  orgIdFromParam,
  orgIdFromProjectParam,
  projectIdFromParam,
  requireOrgRole,
  requireProjectAccess,
  requireProjectRole,
} from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as projectController from "./project.controller";
import * as membershipController from "../orgs/membership.controller";
import { createProjectSchema, updateProjectSchema } from "./project.validators";

export const orgProjectsRouter = Router({ mergeParams: true });
orgProjectsRouter.use(requireAuth);

orgProjectsRouter.post(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ body: createProjectSchema }),
  projectController.createProject
);
orgProjectsRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  projectController.listProjects
);

export const projectRouter = Router();
projectRouter.use(requireAuth);

projectRouter.get(
  "/:projectId",
  requireOrgRole("VIEWER", orgIdFromProjectParam()),
  requireProjectAccess(projectIdFromParam()),
  projectController.getProject
);
projectRouter.get(
  "/:projectId/members",
  requireOrgRole("VIEWER", orgIdFromProjectParam()),
  requireProjectAccess(projectIdFromParam()),
  membershipController.listProjectMembers
);
projectRouter.patch(
  "/:projectId",
  requireOrgRole("VIEWER", orgIdFromProjectParam()),
  requireProjectRole("ADMIN", projectIdFromParam()),
  validate({ body: updateProjectSchema }),
  projectController.updateProject
);
projectRouter.delete(
  "/:projectId",
  requireOrgRole("OWNER", orgIdFromProjectParam()),
  requireProjectAccess(projectIdFromParam()),
  projectController.deleteProject
);

export const orgProjectCreationRequestsRouter = Router({ mergeParams: true });
orgProjectCreationRequestsRouter.use(requireAuth);
orgProjectCreationRequestsRouter.get(
  "/",
  requireOrgRole("OWNER", orgIdFromParam()),
  projectController.listProjectCreationRequests
);
orgProjectCreationRequestsRouter.post(
  "/:requestId/approve",
  requireOrgRole("OWNER", orgIdFromParam()),
  projectController.approveProjectCreationRequest
);
orgProjectCreationRequestsRouter.post(
  "/:requestId/reject",
  requireOrgRole("OWNER", orgIdFromParam()),
  projectController.rejectProjectCreationRequest
);

export const orgProjectCreateAutoApproveRouter = Router({ mergeParams: true });
orgProjectCreateAutoApproveRouter.use(requireAuth);
orgProjectCreateAutoApproveRouter.get(
  "/",
  requireOrgRole("OWNER", orgIdFromParam()),
  projectController.listCreateAutoApproveRules
);
orgProjectCreateAutoApproveRouter.post(
  "/:adminId",
  requireOrgRole("OWNER", orgIdFromParam()),
  projectController.enableCreateAutoApprove
);
orgProjectCreateAutoApproveRouter.delete(
  "/:adminId",
  requireOrgRole("OWNER", orgIdFromParam()),
  projectController.disableCreateAutoApprove
);
