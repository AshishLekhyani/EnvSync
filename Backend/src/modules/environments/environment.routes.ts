import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  orgIdFromEnvironmentParam,
  orgIdFromProjectParam,
  requireOrgRole,
} from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as environmentController from "./environment.controller";
import { createEnvironmentSchema } from "./environment.validators";

export const projectEnvironmentsRouter = Router({ mergeParams: true });
projectEnvironmentsRouter.use(requireAuth);

projectEnvironmentsRouter.post(
  "/",
  requireOrgRole("ADMIN", orgIdFromProjectParam()),
  validate({ body: createEnvironmentSchema }),
  environmentController.createEnvironment
);
projectEnvironmentsRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromProjectParam()),
  environmentController.listEnvironments
);

export const environmentRouter = Router();
environmentRouter.use(requireAuth);

environmentRouter.get(
  "/:environmentId",
  requireOrgRole("VIEWER", orgIdFromEnvironmentParam()),
  environmentController.getEnvironment
);
environmentRouter.delete(
  "/:environmentId",
  requireOrgRole("ADMIN", orgIdFromEnvironmentParam()),
  environmentController.deleteEnvironment
);
