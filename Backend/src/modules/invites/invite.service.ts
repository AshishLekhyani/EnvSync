import crypto from "node:crypto";
import { OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { sha256Hex } from "../../common/hash";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { assertCanAssignRole, Actor } from "../orgs/membership.service";
import { writeAuditLog } from "../audit/audit.service";
import { CreateInviteInput } from "./invite.validators";

export const INVITE_PREFIX = "invite_";
const INVITE_EXPIRY_DAYS = 7;

function generateRawToken(): string {
  return INVITE_PREFIX + crypto.randomBytes(32).toString("base64url");
}

interface InviteRow {
  id: string;
  email: string;
  role: OrgRole;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}

function toSummary(invite: InviteRow) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
  };
}

export async function createInvite(
  orgId: string,
  input: CreateInviteInput,
  actor: Actor,
  ipAddress?: string
) {
  assertCanAssignRole(actor.role, input.role);

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    const existingMembership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId: existingUser.id, orgId } },
    });
    if (existingMembership) {
      throw new ConflictError("This person is already a member of this organization");
    }
  }

  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const created = await prisma.$transaction(async (tx) => {
    await tx.orgInvite.deleteMany({
      where: { orgId, email: input.email, acceptedAt: null },
    });

    const invite = await tx.orgInvite.create({
      data: {
        orgId,
        email: input.email,
        role: input.role,
        tokenHash,
        invitedById: actor.id,
        expiresAt,
      },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "invite.create",
      targetType: "OrgInvite",
      targetId: invite.id,
      metadata: { email: input.email, role: input.role },
      ipAddress,
    });

    return invite;
  });

  return { ...toSummary(created), token: rawToken };
}

export async function listInvites(orgId: string) {
  const invites = await prisma.orgInvite.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  return invites.map(toSummary);
}

export async function getInviteByToken(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);

  const invite = await prisma.orgInvite.findUnique({
    where: { tokenHash },
    include: { org: { select: { name: true, slug: true } } },
  });

  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  return {
    orgName: invite.org.name,
    orgSlug: invite.org.slug,
    role: invite.role,
    email: invite.email,
    expiresAt: invite.expiresAt,
    accepted: invite.acceptedAt !== null,
    expired: invite.expiresAt < new Date(),
  };
}

export async function acceptInvite(
  rawToken: string,
  user: { id: string; email: string },
  ipAddress?: string
) {
  const tokenHash = sha256Hex(rawToken);

  const invite = await prisma.orgInvite.findUnique({ where: { tokenHash } });
  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  if (invite.acceptedAt) {
    throw new ConflictError("This invite has already been used");
  }

  if (invite.expiresAt < new Date()) {
    throw new ConflictError("This invite has expired");
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ForbiddenError("This invite was sent to a different email address");
  }

  const existingMembership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
  });
  if (existingMembership) {
    throw new ConflictError("You are already a member of this organization");
  }

  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.orgMembership.create({
      data: { userId: user.id, orgId: invite.orgId, role: invite.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await tx.orgInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedById: user.id },
    });

    await writeAuditLog(tx, {
      orgId: invite.orgId,
      actorId: user.id,
      action: "invite.accept",
      targetType: "OrgMembership",
      targetId: created.id,
      metadata: { email: invite.email, role: invite.role },
      ipAddress,
    });

    return created;
  });

  return {
    membershipId: membership.id,
    role: membership.role,
    user: membership.user,
  };
}
