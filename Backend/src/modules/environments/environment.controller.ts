import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as environmentService from "./environment.service";
import { getEffectiveAccess } from "../rbac/permissions.service";
import { CreateEnvironmentInput } from "./environment.validators";

export const createEnvironment = asyncHandler(async (req, res) => {
  const environment = await environmentService.createEnvironment(
    req.params.projectId,
    req.body as CreateEnvironmentInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json({ ...environment, access: "write" });
});

export const listEnvironments = asyncHandler(async (req, res) => {
  const environments = await environmentService.listEnvironments(
    req.params.projectId
  );
  const withAccess = await Promise.all(
    environments.map(async (environment) => ({
      ...environment,
      access: await getEffectiveAccess(
        req.membership!.orgId,
        req.params.projectId,
        req.user!.id,
        req.membership!.role,
        environment.type
      ),
    }))
  );
  res.status(200).json(withAccess);
});

export const getEnvironment = asyncHandler(async (req, res) => {
  const environment = await environmentService.getEnvironment(
    req.params.environmentId
  );
  const access = await getEffectiveAccess(
    req.membership!.orgId,
    environment.projectId,
    req.user!.id,
    req.membership!.role,
    environment.type
  );
  res.status(200).json({ ...environment, access });
});

export const deleteEnvironment = asyncHandler(async (req, res) => {
  await environmentService.deleteEnvironment(
    req.params.environmentId,
    req.user!.id,
    req.ip
  );
  res.status(204).send();
});
