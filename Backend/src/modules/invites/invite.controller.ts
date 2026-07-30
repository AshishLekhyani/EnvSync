import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as inviteService from "./invite.service";
import { CreateInviteInput, SetBlanketAutoApproveInput } from "./invite.validators";

export const createInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.createInvite(
    req.params.orgId,
    req.body as CreateInviteInput,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(201).json(invite);
});

export const listInvites = asyncHandler(async (req, res) => {
  const invites = await inviteService.listInvites(req.params.orgId);
  res.status(200).json(invites);
});

export const getInviteByToken = asyncHandler(async (req, res) => {
  const invite = await inviteService.getInviteByToken(req.params.token);
  res.status(200).json(invite);
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const membership = await inviteService.acceptInvite(
    req.params.token,
    { id: req.user!.id, email: req.user!.email },
    req.ip
  );
  res.status(200).json(membership);
});

export const approveInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.approveInvite(
    req.params.orgId,
    req.params.inviteId,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(200).json(invite);
});

export const rejectInvite = asyncHandler(async (req, res) => {
  const invite = await inviteService.rejectInvite(
    req.params.orgId,
    req.params.inviteId,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(200).json(invite);
});

export const listAutoApproveRules = asyncHandler(async (req, res) => {
  const rules = await inviteService.listAutoApproveRules(req.params.orgId);
  res.status(200).json(rules);
});

export const setBlanketAutoApprove = asyncHandler(async (req, res) => {
  const rules = await inviteService.setBlanketAutoApprove(
    req.params.orgId,
    req.body as SetBlanketAutoApproveInput,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(200).json(rules);
});

export const enableInviterAutoApprove = asyncHandler(async (req, res) => {
  const rules = await inviteService.setInviterAutoApprove(
    req.params.orgId,
    req.params.userId,
    true,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(200).json(rules);
});

export const disableInviterAutoApprove = asyncHandler(async (req, res) => {
  const rules = await inviteService.setInviterAutoApprove(
    req.params.orgId,
    req.params.userId,
    false,
    { id: req.user!.id, role: req.membership!.role },
    req.ip
  );
  res.status(200).json(rules);
});
