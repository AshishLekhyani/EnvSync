import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import {
  environmentIdFromParam,
  environmentIdFromSecretParam,
  requireEnvironmentAccess,
} from "../rbac/rbac.middleware";
import { validate } from "../../common/validation/validate";
import * as secretController from "./secret.controller";
import {
  createSecretSchema,
  rotateSecretSchema,
  setSecretExpirySchema,
  updateSecretSchema,
} from "./secret.validators";

export const environmentSecretsRouter = Router({ mergeParams: true });
environmentSecretsRouter.use(requireAuth);

environmentSecretsRouter.post(
  "/",
  requireEnvironmentAccess("write", environmentIdFromParam()),
  validate({ body: createSecretSchema }),
  secretController.createSecret
);
environmentSecretsRouter.get(
  "/",
  requireEnvironmentAccess("read", environmentIdFromParam()),
  secretController.listSecrets
);

export const secretRouter = Router();
secretRouter.use(requireAuth);

secretRouter.get(
  "/:secretId",
  requireEnvironmentAccess("read", environmentIdFromSecretParam()),
  secretController.getSecret
);
secretRouter.get(
  "/:secretId/reveal",
  requireEnvironmentAccess("read", environmentIdFromSecretParam()),
  secretController.revealSecret
);
secretRouter.patch(
  "/:secretId",
  requireEnvironmentAccess("write", environmentIdFromSecretParam()),
  validate({ body: updateSecretSchema }),
  secretController.updateSecret
);
secretRouter.delete(
  "/:secretId",
  requireEnvironmentAccess("write", environmentIdFromSecretParam()),
  secretController.deleteSecret
);
secretRouter.patch(
  "/:secretId/expiry",
  requireEnvironmentAccess("write", environmentIdFromSecretParam()),
  validate({ body: setSecretExpirySchema }),
  secretController.setSecretExpiry
);
secretRouter.get(
  "/:secretId/versions",
  requireEnvironmentAccess("read", environmentIdFromSecretParam()),
  secretController.listSecretVersions
);
secretRouter.get(
  "/:secretId/versions/:version/reveal",
  requireEnvironmentAccess("read", environmentIdFromSecretParam()),
  secretController.revealSecretVersion
);
secretRouter.post(
  "/:secretId/versions/:version/restore",
  requireEnvironmentAccess("write", environmentIdFromSecretParam()),
  secretController.restoreSecretVersion
);
secretRouter.post(
  "/:secretId/rotate",
  requireEnvironmentAccess("write", environmentIdFromSecretParam()),
  validate({ body: rotateSecretSchema }),
  secretController.rotateSecret
);
