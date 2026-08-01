import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as roleChangeRequestService from "./roleChangeRequest.service";
import { CreateRoleChangeRequestInput } from "./roleChangeRequest.validators";

export const createRoleChangeRequest = asyncHandler(async (req, res) => {
  const { requestedRole } = req.body as CreateRoleChangeRequestInput;
  const request = await roleChangeRequestService.createRoleChangeRequest(
    req.params.orgId,
    { id: req.user!.id, role: req.membership!.role },
    requestedRole,
    req.ip
  );
  res.status(201).json(request);
});

export const listRoleChangeRequests = asyncHandler(async (req, res) => {
  const requests = await roleChangeRequestService.listRoleChangeRequests(req.params.orgId);
  res.status(200).json(requests);
});

export const getMyPendingRequest = asyncHandler(async (req, res) => {
  const request = await roleChangeRequestService.getMyPendingRequest(
    req.params.orgId,
    req.user!.id
  );
  res.status(200).json(request);
});

export const approveRoleChangeRequest = asyncHandler(async (req, res) => {
  await roleChangeRequestService.approveRoleChangeRequest(
    req.params.orgId,
    req.params.requestId,
    req.membership!,
    req.ip
  );
  res.status(204).send();
});

export const rejectRoleChangeRequest = asyncHandler(async (req, res) => {
  await roleChangeRequestService.rejectRoleChangeRequest(
    req.params.orgId,
    req.params.requestId,
    req.membership!,
    req.ip
  );
  res.status(204).send();
});
