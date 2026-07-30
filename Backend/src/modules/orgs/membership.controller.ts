import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as membershipService from "./membership.service";
import { getAccessibleProjectIds } from "../rbac/projectAccess.service";
import {
  AddMemberInput,
  SetCanViewAllProjectsInput,
  UpdateMemberRoleInput,
} from "./membership.validators";

export const listMembers = asyncHandler(async (req, res) => {
  const accessibleProjectIds = await getAccessibleProjectIds(
    req.params.orgId,
    req.user!.id,
    req.membership!.role,
    req.membership!
  );
  const members = await membershipService.listMembers(req.params.orgId, accessibleProjectIds);
  res.status(200).json(members);
});

export const addMember = asyncHandler(async (req, res) => {
  const membership = await membershipService.addMember(
    req.params.orgId,
    req.body as AddMemberInput,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(201).json(membership);
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const membership = await membershipService.updateMemberRole(
    req.params.orgId,
    req.params.membershipId,
    req.body as UpdateMemberRoleInput,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(200).json(membership);
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
  await membershipService.grantProjectAccess(
    req.params.orgId,
    req.params.membershipId,
    req.params.projectId,
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
