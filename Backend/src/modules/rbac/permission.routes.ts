import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { requireOrgRole, orgIdFromParam } from "./rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as permissionController from "./permission.controller";
import { setPermissionOverrideSchema } from "./permission.validators";

export const orgPermissionsRouter = Router({ mergeParams: true });
orgPermissionsRouter.use(requireAuth);

orgPermissionsRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  permissionController.getMatrix
);
orgPermissionsRouter.patch(
  "/",
  requireOrgRole("ADMIN", orgIdFromParam()),
  validate({ body: setPermissionOverrideSchema }),
  permissionController.setOverride
);
