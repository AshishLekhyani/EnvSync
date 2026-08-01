import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as membershipService from "./membership.service";
import {
  CheckEmailQuery,
  GrantProjectAccessInput,
  SetCanViewAllProjectsInput,
  TransferOwnershipInput,
} from "./membership.validators";

export const listMembers = asyncHandler(async (req, res) => {
  const members = await membershipService.listMembers(req.params.orgId, req.membership!.role);
  res.status(200).json(members);
});

export const listProjectMembers = asyncHandler(async (req, res) => {
  const members = await membershipService.listProjectMembers(req.params.projectId);
  res.status(200).json(members);
});

export const checkEmailExists = asyncHandler(async (req, res) => {
  const query = req.query as unknown as CheckEmailQuery;
  const exists = await membershipService.checkEmailExists(query.email);
  res.status(200).json({ exists });
});

export const removeMember = asyncHandler(async (req, res) => {
  await membershipService.removeMember(
    req.params.orgId,
    req.params.membershipId,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(204).send();
});

export const grantProjectAccess = asyncHandler(async (req, res) => {
  const { role } = req.body as GrantProjectAccessInput;
  await membershipService.grantProjectAccess(
    req.params.orgId,
    req.params.membershipId,
    req.params.projectId,
    role,
    req.membership!,
    req.ip
  );
  res.status(204).send();
});

export const revokeProjectAccess = asyncHandler(async (req, res) => {
  await membershipService.revokeProjectAccess(
    req.params.orgId,
    req.params.membershipId,
    req.params.projectId,
    req.membership!,
    req.ip
  );
  res.status(204).send();
});

export const setCanViewAllProjects = asyncHandler(async (req, res) => {
  const membership = await membershipService.setCanViewAllProjects(
    req.params.orgId,
    req.params.membershipId,
    (req.body as SetCanViewAllProjectsInput).canViewAllProjects,
    req.user!.id,
    req.ip
  );
  res.status(200).json(membership);
});

export const leaveOrganization = asyncHandler(async (req, res) => {
  await membershipService.leaveOrganization(req.params.orgId, req.user!.id, req.ip);
  res.status(204).send();
});

export const leaveProject = asyncHandler(async (req, res) => {
  await membershipService.leaveProject(
    req.params.orgId,
    req.params.projectId,
    req.user!.id,
    req.ip
  );
  res.status(204).send();
});

export const transferOwnership = asyncHandler(async (req, res) => {
  await membershipService.transferOwnership(
    req.params.orgId,
    (req.body as TransferOwnershipInput).membershipId,
    req.user!.id,
    req.ip
  );
  res.status(204).send();
});
