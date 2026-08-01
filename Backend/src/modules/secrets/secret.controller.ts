import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as secretService from "./secret.service";
import {
  BulkUpsertSecretsInput,
  CreateSecretInput,
  RotateSecretInput,
  SetSecretExpiryInput,
  UpdateSecretInput,
} from "./secret.validators";

export const createSecret = asyncHandler(async (req, res) => {
  const secret = await secretService.createSecret(
    req.params.environmentId,
    req.body as CreateSecretInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json(secret);
});

export const bulkUpsertSecrets = asyncHandler(async (req, res) => {
  const results = await secretService.bulkUpsertSecrets(
    req.params.environmentId,
    req.body as BulkUpsertSecretsInput,
    req.user!.id,
    req.ip
  );
  res.status(200).json(results);
});

export const listSecrets = asyncHandler(async (req, res) => {
  const secrets = await secretService.listSecrets(req.params.environmentId);
  res.status(200).json(secrets);
});

export const listDeletedSecrets = asyncHandler(async (req, res) => {
  const secrets = await secretService.listDeletedSecrets(req.params.environmentId);
  res.status(200).json(secrets);
});

export const restoreDeletedSecret = asyncHandler(async (req, res) => {
  const secret = await secretService.restoreDeletedSecret(
    req.params.secretId,
    req.user!.id,
    req.ip
  );
  res.status(200).json(secret);
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

export const setSecretExpiry = asyncHandler(async (req, res) => {
  const input = req.body as SetSecretExpiryInput;
  const secret = await secretService.setSecretExpiry(
    req.params.secretId,
    input.expiresAt,
    req.user!.id,
    req.ip
  );
  res.status(200).json(secret);
});

export const deleteSecret = asyncHandler(async (req, res) => {
  await secretService.deleteSecret(req.params.secretId, req.user!.id, req.ip);
  res.status(204).send();
});

export const listSecretVersions = asyncHandler(async (req, res) => {
  const versions = await secretService.listSecretVersions(req.params.secretId);
  res.status(200).json(versions);
});

export const revealSecretVersion = asyncHandler(async (req, res) => {
  const result = await secretService.revealSecretVersion(
    req.params.secretId,
    Number(req.params.version),
    req.user!.id,
    req.ip
  );
  res.status(200).json(result);
});

export const restoreSecretVersion = asyncHandler(async (req, res) => {
  const secret = await secretService.restoreSecretVersion(
    req.params.secretId,
    Number(req.params.version),
    req.user!.id,
    req.ip
  );
  res.status(200).json(secret);
});

export const rotateSecret = asyncHandler(async (req, res) => {
  const input = req.body as RotateSecretInput;
  const secret = await secretService.rotateSecret(
    req.params.secretId,
    req.user!.id,
    req.ip,
    input.length
  );
  res.status(200).json(secret);
});
