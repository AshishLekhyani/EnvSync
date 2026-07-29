import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as environmentService from "./environment.service";
import { CreateEnvironmentInput } from "./environment.validators";

export const createEnvironment = asyncHandler(async (req, res) => {
  const environment = await environmentService.createEnvironment(
    req.params.projectId,
    req.body as CreateEnvironmentInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json(environment);
});

export const listEnvironments = asyncHandler(async (req, res) => {
  const environments = await environmentService.listEnvironments(
    req.params.projectId
  );
  res.status(200).json(environments);
});

export const getEnvironment = asyncHandler(async (req, res) => {
  const environment = await environmentService.getEnvironment(
    req.params.environmentId
  );
  res.status(200).json(environment);
});

export const deleteEnvironment = asyncHandler(async (req, res) => {
  await environmentService.deleteEnvironment(
    req.params.environmentId,
    req.user!.id,
    req.ip
  );
  res.status(204).send();
});
