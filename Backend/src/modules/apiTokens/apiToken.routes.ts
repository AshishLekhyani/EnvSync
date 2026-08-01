import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { orgIdFromParam, requireOrgRole } from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as apiTokenController from "./apiToken.controller";
import { createApiTokenSchema } from "./apiToken.validators";

export const orgApiTokensRouter = Router({ mergeParams: true });

orgApiTokensRouter.use(requireAuth);

orgApiTokensRouter.post(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  validate({ body: createApiTokenSchema }),
  apiTokenController.createApiToken
);
orgApiTokensRouter.get(
  "/",
  requireOrgRole("VIEWER", orgIdFromParam()),
  apiTokenController.listApiTokens
);
orgApiTokensRouter.delete(
  "/:tokenId",
  requireOrgRole("VIEWER", orgIdFromParam()),
  apiTokenController.revokeApiToken
);
