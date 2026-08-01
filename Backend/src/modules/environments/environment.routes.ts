import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  orgIdFromEnvironmentParam,
  orgIdFromProjectParam,
  projectIdFromEnvironmentParam,
  projectIdFromParam,
  requireOrgRole,
  requireProjectAccess,
  requireProjectRole,
} from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as environmentController from "./environment.controller";
import { createEnvironmentSchema } from "./environment.validators";

export const projectEnvironmentsRouter = Router({ mergeParams: true });
projectEnvironmentsRouter.use(requireAuth);

projectEnvironmentsRouter.post(
  "/",
  requireOrgRole("VIEWER", orgIdFromProjectParam()),
  requireProjectRole("ADMIN", projectIdFromParam()),
  validate({ body: createEnvironmentSchema }),
  environmentController.createEnvironment
);
projectEnvironmentsRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromProjectParam()),
  requireProjectAccess(projectIdFromParam()),
  environmentController.listEnvironments
);

export const environmentRouter = Router();
environmentRouter.use(requireAuth);

environmentRouter.get(
  "/:environmentId",
  requireOrgRole("VIEWER", orgIdFromEnvironmentParam()),
  requireProjectAccess(projectIdFromEnvironmentParam()),
  environmentController.getEnvironment
);
environmentRouter.delete(
  "/:environmentId",
  requireOrgRole("VIEWER", orgIdFromEnvironmentParam()),
  requireProjectRole("ADMIN", projectIdFromEnvironmentParam()),
  environmentController.deleteEnvironment
);
