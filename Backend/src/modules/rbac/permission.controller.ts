import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as permissionsService from "./permissions.service";
import { SetPermissionOverrideInput } from "./permission.validators";

export const getMatrix = asyncHandler(async (req, res) => {
  const matrix = await permissionsService.getPermissionMatrix(req.params.orgId);
  res.status(200).json(matrix);
});

export const setOverride = asyncHandler(async (req, res) => {
  const input = req.body as SetPermissionOverrideInput;
  const matrix = await permissionsService.setPermissionOverride(
    req.params.orgId,
    input,
    req.user!.id,
    req.ip
  );
  res.status(200).json(matrix);
});
