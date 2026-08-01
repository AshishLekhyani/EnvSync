import crypto from "node:crypto";
import { InviteApprovalStatus, OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { sha256Hex } from "../../common/hash";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { assertCanAssignRole, Actor } from "../orgs/membership.service";
import { writeAuditLog } from "../audit/audit.service";
import { shouldNotify } from "../notifications/notification.service";
import { notifyUserNotificationCreated } from "../auth/sse";
import { env } from "../../config/env";
import { isEmailConfigured, sendEmail } from "../email/email.service";
import { inviteEmail } from "../email/templates";
import { CreateInviteInput, SetBlanketAutoApproveInput } from "./invite.validators";

export const INVITE_PREFIX = "invite_";
const INVITE_EXPIRY_DAYS = 7;

function generateRawToken(): string {
  return INVITE_PREFIX + crypto.randomBytes(32).toString("base64url");
}

interface InviteRow {
  id: string;
  email: string;
  role: OrgRole;
  projectId: string | null;
  approvalStatus: InviteApprovalStatus;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}

function toSummary(invite: InviteRow) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    projectId: invite.projectId,
    approvalStatus: invite.approvalStatus,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
  };
}

async function sendInviteEmail(
  orgId: string,
  email: string,
  role: OrgRole,
  rawToken: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  if (!org) return false;

  const link = `${env.CORS_ORIGIN}/invite/${rawToken}`;
  try {
    await sendEmail({ to: email, ...inviteEmail(org.name, role, link) });
    return true;
  } catch (err) {
    console.error("Failed to send invite email", err);
    return false;
  }
}

async function notifyApprovers(
  orgId: string,
  invite: { id: string; email: string; role: OrgRole },
  inviter: { id: string; name: string }
) {
  const inviterMembership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId: inviter.id, orgId } },
    select: { invitedById: true },
  });

  let recipientIds: string[] = [];

  if (inviterMembership?.invitedById) {
    const traceableApprover = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId: inviterMembership.invitedById, orgId } },
      select: { userId: true, role: true },
    });
    if (traceableApprover && (traceableApprover.role === "OWNER" || traceableApprover.role === "ADMIN")) {
      recipientIds = [traceableApprover.userId];
    }
  }

  if (recipientIds.length === 0) {
    const admins = await prisma.orgMembership.findMany({
      where: { orgId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });
    recipientIds = admins.map((a) => a.userId);
  }

  if (recipientIds.length === 0) return;

  const notifiable = await Promise.all(
    recipientIds.map(async (id) => ((await shouldNotify(id, "approvalRequests")) ? id : null))
  );
  recipientIds = notifiable.filter((id): id is string => id !== null);
  if (recipientIds.length === 0) return;

  await prisma.notification.createMany({
    data: recipientIds.map((recipientId) => ({
      orgId,
      recipientId,
      type: "invite.approval_requested",
      message: `${inviter.name} wants to invite ${invite.email} as ${invite.role}`,
      targetType: "OrgInvite",
      targetId: invite.id,
      metadata: { orgId, inviteId: invite.id, inviteEmail: invite.email, inviterName: inviter.name },
    })),
  });
  for (const recipientId of recipientIds) {
    notifyUserNotificationCreated(recipientId);
  }
}

export async function createInvite(
  orgId: string,
  input: CreateInviteInput,
  actor: Actor,
  ipAddress?: string
) {
  assertCanAssignRole(actor.role, input.role);

  if (input.projectId) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project || project.orgId !== orgId) {
      throw new NotFoundError("Project not found");
    }
  }

  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    const existingMembership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId: existingUser.id, orgId } },
    });
    if (existingMembership && !input.projectId) {
      throw new ConflictError("This person is already a member of this organization");
    }
  }

  let needsApproval = actor.role === "DEVELOPER";
  if (needsApproval) {
    const autoApproveRule = await prisma.inviteAutoApproveRule.findFirst({
      where: { orgId, OR: [{ inviterId: actor.id }, { inviterId: null }] },
    });
    if (autoApproveRule) {
      needsApproval = false;
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
        projectId: input.projectId,
        tokenHash,
        invitedById: actor.id,
        approvalStatus: needsApproval ? "PENDING" : "NONE",
        expiresAt,
      },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "invite.create",
      targetType: "OrgInvite",
      targetId: invite.id,
      projectId: invite.projectId ?? undefined,
      metadata: {
        email: input.email,
        role: input.role,
        projectId: input.projectId ?? null,
        approvalStatus: invite.approvalStatus,
      },
      ipAddress,
    });

    return invite;
  });

  let emailSent = false;

  if (needsApproval) {
    const inviter = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { id: true, name: true },
    });
    await notifyApprovers(orgId, created, inviter);
  } else {
    emailSent = await sendInviteEmail(orgId, created.email, created.role, rawToken);
  }

  return { ...toSummary(created), token: emailSent ? null : rawToken };
}

export async function listInvites(orgId: string) {
  const invites = await prisma.orgInvite.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  const acceptedUserIds = invites
    .map((i) => i.acceptedById)
    .filter((id): id is string => id !== null);

  const stillMemberIds = acceptedUserIds.length
    ? new Set(
        (
          await prisma.orgMembership.findMany({
            where: { orgId, userId: { in: acceptedUserIds } },
            select: { userId: true },
          })
        ).map((m) => m.userId)
      )
    : new Set<string>();

  const visible = invites.filter(
    (i) => !i.acceptedById || stillMemberIds.has(i.acceptedById)
  );

  return visible.map(toSummary);
}

export async function getInviteByToken(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);

  const invite = await prisma.orgInvite.findUnique({
    where: { tokenHash },
    include: {
      org: { select: { name: true, slug: true } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!invite) {
    throw new NotFoundError("Invite not found");
  }

  return {
    orgId: invite.orgId,
    orgName: invite.org.name,
    orgSlug: invite.org.slug,
    role: invite.role,
    email: invite.email,
    project: invite.project ? { id: invite.project.id, name: invite.project.name } : null,
    expiresAt: invite.expiresAt,
    accepted: invite.acceptedAt !== null,
    expired: invite.expiresAt < new Date(),
    pendingApproval: invite.approvalStatus === "PENDING",
    rejected: invite.approvalStatus === "REJECTED",
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

  if (invite.approvalStatus === "PENDING") {
    throw new ConflictError("This invite is still waiting on admin approval");
  }

  if (invite.approvalStatus === "REJECTED") {
    throw new ConflictError("This invite was declined");
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ForbiddenError("This invite was sent to a different email address");
  }

  const existingMembership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
  });

  if (existingMembership && !invite.projectId) {
    throw new ConflictError("You are already a member of this organization");
  }

  const membership = await prisma.$transaction(async (tx) => {
    const membershipRow = existingMembership
      ? await tx.orgMembership.findUniqueOrThrow({
          where: { id: existingMembership.id },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      : await tx.orgMembership.create({
          data: {
            userId: user.id,
            orgId: invite.orgId,
            role: invite.role,
            invitedById: invite.invitedById,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

    if (invite.projectId) {
      const existingGrant = await tx.projectMembership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId: invite.projectId } },
      });
      if (!existingGrant && invite.role !== "OWNER") {
        await tx.projectMembership.create({
          data: {
            userId: user.id,
            projectId: invite.projectId,
            role: invite.role,
            grantedById: invite.invitedById,
          },
        });
      }
    }

    await tx.orgInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedById: user.id },
    });

    await writeAuditLog(tx, {
      orgId: invite.orgId,
      actorId: user.id,
      action: "invite.accept",
      targetType: "OrgMembership",
      targetId: membershipRow.id,
      projectId: invite.projectId ?? undefined,
      metadata: { email: invite.email, role: invite.role, projectId: invite.projectId },
      ipAddress,
    });

    return membershipRow;
  });

  return {
    membershipId: membership.id,
    orgId: invite.orgId,
    role: membership.role,
    user: membership.user,
  };
}

async function getPendingInvite(orgId: string, inviteId: string) {
  const invite = await prisma.orgInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.orgId !== orgId) {
    throw new NotFoundError("Invite not found");
  }
  if (invite.approvalStatus !== "PENDING") {
    throw new ConflictError("This invite is not waiting on approval");
  }
  return invite;
}

export async function approveInvite(
  orgId: string,
  inviteId: string,
  actor: Actor,
  ipAddress?: string
) {
  const invite = await getPendingInvite(orgId, inviteId);

  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);

  const updated = await prisma.orgInvite.update({
    where: { id: inviteId },
    data: {
      approvalStatus: "APPROVED",
      approvedById: actor.id,
      approvedAt: new Date(),
      tokenHash,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  const emailSent = await sendInviteEmail(orgId, updated.email, updated.role, rawToken);

  await writeAuditLog(prisma, {
    orgId,
    actorId: actor.id,
    action: "invite.approve",
    targetType: "OrgInvite",
    targetId: inviteId,
    metadata: { email: invite.email, role: invite.role },
    ipAddress,
  });

  return { ...toSummary(updated), token: emailSent ? null : rawToken };
}

export async function rejectInvite(
  orgId: string,
  inviteId: string,
  actor: Actor,
  ipAddress?: string
) {
  const invite = await getPendingInvite(orgId, inviteId);

  const updated = await prisma.orgInvite.update({
    where: { id: inviteId },
    data: { approvalStatus: "REJECTED" },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: actor.id,
    action: "invite.reject",
    targetType: "OrgInvite",
    targetId: inviteId,
    metadata: { email: invite.email, role: invite.role },
    ipAddress,
  });

  return toSummary(updated);
}

export async function listAutoApproveRules(orgId: string) {
  const rules = await prisma.inviteAutoApproveRule.findMany({
    where: { orgId },
    include: {
      inviter: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rules.map((r) => ({
    id: r.id,
    inviter: r.inviter,
    createdByName: r.createdBy.name,
    createdAt: r.createdAt,
  }));
}

export async function setBlanketAutoApprove(
  orgId: string,
  input: SetBlanketAutoApproveInput,
  actor: Actor,
  ipAddress?: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.inviteAutoApproveRule.deleteMany({ where: { orgId, inviterId: null } });

    if (input.enabled) {
      await tx.inviteAutoApproveRule.create({
        data: { orgId, inviterId: null, createdById: actor.id },
      });
    }

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "invite.auto_approve_set",
      targetType: "InviteAutoApproveRule",
      metadata: { scope: "org-wide", enabled: input.enabled },
      ipAddress,
    });
  });

  return listAutoApproveRules(orgId);
}

export async function setInviterAutoApprove(
  orgId: string,
  inviterUserId: string,
  enabled: boolean,
  actor: Actor,
  ipAddress?: string
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId: inviterUserId, orgId } },
    include: { user: { select: { email: true } } },
  });
  if (!membership) {
    throw new NotFoundError("Member not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.inviteAutoApproveRule.deleteMany({ where: { orgId, inviterId: inviterUserId } });

    if (enabled) {
      await tx.inviteAutoApproveRule.create({
        data: { orgId, inviterId: inviterUserId, createdById: actor.id },
      });
    }

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "invite.auto_approve_set",
      targetType: "InviteAutoApproveRule",
      metadata: { scope: "member", targetUserEmail: membership.user.email, enabled },
      ipAddress,
    });
  });

  return listAutoApproveRules(orgId);
}
