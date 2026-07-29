import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as secretService from "./secret.service";
import { CreateSecretInput, UpdateSecretInput } from "./secret.validators";

export const createSecret = asyncHandler(async (req, res) => {
  const secret = await secretService.createSecret(
    req.params.environmentId,
    req.body as CreateSecretInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json(secret);
});

export const listSecrets = asyncHandler(async (req, res) => {
  const secrets = await secretService.listSecrets(req.params.environmentId);
  res.status(200).json(secrets);
});

export const getSecret = asyncHandler(async (req, res) => {
  const secret = await secretService.getSecret(req.params.secretId);
  res.status(200).json(secret);
});

export const revealSecret = asyncHandler(async (req, res) => {
  const secret = await secretService.revealSecret(
    req.params.secretId,
    req.user!.id,
    req.ip
  );
  res.status(200).json(secret);
});

export const updateSecret = asyncHandler(async (req, res) => {
  const secret = await secretService.updateSecret(
    req.params.secretId,
    req.body as UpdateSecretInput,
    req.user!.id,
    req.ip
  );
  res.status(200).json(secret);
});

export const deleteSecret = asyncHandler(async (req, res) => {
  await secretService.deleteSecret(req.params.secretId, req.user!.id, req.ip);
  res.status(204).send();
});
