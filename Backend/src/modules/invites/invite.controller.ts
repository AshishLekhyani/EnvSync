import { asyncHandler } from "../../common/middleware/asyncHandler";
import * as inviteService from "./invite.service";
import { CreateInviteInput } from "./invite.validators";

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
