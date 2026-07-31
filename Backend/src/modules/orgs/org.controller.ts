import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as orgService from "./org.service";
import { CreateOrgInput, UpdateOrgInput } from "./org.validators";

export const createOrg = asyncHandler(async (req, res) => {
  const org = await orgService.createOrganization(
    req.body as CreateOrgInput,
    req.user!.id,
    req.ip
  );
  res.status(201).json(org);
});

export const listOrgs = asyncHandler(async (req, res) => {
  const orgs = await orgService.listOrganizationsForUser(req.user!.id, req.apiTokenOrgId);
  res.status(200).json(orgs);
});

export const getOrg = asyncHandler(async (req, res) => {
  const org = await orgService.getOrganization(req.params.orgId);
  res.status(200).json(org);
});

export const updateOrg = asyncHandler(async (req, res) => {
  const org = await orgService.updateOrganization(
    req.params.orgId,
    req.body as UpdateOrgInput,
    req.user!.id,
    req.ip
  );
  res.status(200).json(org);
});

export const deleteOrg = asyncHandler(async (req, res) => {
  await orgService.deleteOrganization(req.params.orgId, req.user!.id, req.ip);
  res.status(204).send();
});

export const exportOrgData = asyncHandler(async (req, res) => {
  const data = await orgService.exportOrganizationData(req.params.orgId);
  res.status(200).json(data);
});
