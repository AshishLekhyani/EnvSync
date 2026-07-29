import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, orgIdFromProjectParam, requireOrgRole } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as projectController from "./project.controller";
import { createProjectSchema, updateProjectSchema } from "./project.validators";

export const orgProjectsRouter = Router({ mergeParams: true });
orgProjectsRouter.use(requireAuth);

orgProjectsRouter.post(
  "/",
  requireOrgRole("DEVELOPER", orgIdFromParam()),
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
  projectController.getProject
);
projectRouter.patch(
  "/:projectId",
  requireOrgRole("ADMIN", orgIdFromProjectParam()),
  validate({ body: updateProjectSchema }),
  projectController.updateProject
);
projectRouter.delete(
  "/:projectId",
  requireOrgRole("ADMIN", orgIdFromProjectParam()),
  projectController.deleteProject
);
