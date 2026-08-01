import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as apiTokenService from "./apiToken.service";
import { CreateApiTokenInput } from "./apiToken.validators";

export const createApiToken = asyncHandler(async (req, res) => {
  const token = await apiTokenService.createApiToken(
    req.params.orgId,
    req.body as CreateApiTokenInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json(token);
});

export const listApiTokens = asyncHandler(async (req, res) => {
  const tokens = await apiTokenService.listApiTokens(
    req.params.orgId,
    req.user!.id,
    req.membership!.role === "OWNER"
  );
  res.status(200).json(tokens);
});

export const revokeApiToken = asyncHandler(async (req, res) => {
  const token = await apiTokenService.revokeApiToken(
    req.params.orgId,
    req.params.tokenId,
    req.user!.id,
    req.membership!.role === "OWNER",
    req.ip
  );
  res.status(200).json(token);
});
