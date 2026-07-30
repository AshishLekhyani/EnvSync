import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as accessRequestService from "./projectAccessRequest.service";

export const createAccessRequest = asyncHandler(async (req, res) => {
  const request = await accessRequestService.createAccessRequest(
    req.params.orgId,
    req.params.projectId,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(201).json(request);
});

export const listAccessRequests = asyncHandler(async (req, res) => {
  const requests = await accessRequestService.listAccessRequests(req.params.orgId);
  res.status(200).json(requests);
});

export const approveAccessRequest = asyncHandler(async (req, res) => {
  await accessRequestService.approveAccessRequest(
    req.params.orgId,
    req.params.requestId,
    req.membership!,
    req.ip
  );
  res.status(204).send();
});

export const rejectAccessRequest = asyncHandler(async (req, res) => {
  await accessRequestService.rejectAccessRequest(
    req.params.orgId,
    req.params.requestId,
    req.membership!,
    req.ip
  );
  res.status(204).send();
});
