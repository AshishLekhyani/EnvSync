import crypto from "node:crypto";
import { ProjectRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { sha256Hex } from "../../common/hash";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { assertCanAssignRole, Actor } from "../orgs/membership.service";
import { writeAuditLog } from "../audit/audit.service";
import { env } from "../../config/env";
import { isEmailConfigured, sendEmail } from "../email/email.service";
import { inviteEmail } from "../email/templates";
import { CreateInviteInput } from "./invite.validators";

export const INVITE_PREFIX = "invite_";
const INVITE_EXPIRY_DAYS = 7;

function generateRawToken(): string {
  return INVITE_PREFIX + crypto.randomBytes(32).toString("base64url");
}

interface InviteRow {
  id: string;
  email: string;
  role: ProjectRole;
  projectId: string | null;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
}

function toSummary(invite: InviteRow) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.projectId ? invite.role : null,
    projectId: invite.projectId,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
  };
}

async function sendInviteEmail(
  orgId: string,
  email: string,
  role: ProjectRole | null,
  rawToken: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
  if (!org) return false;

  const link = `${env.CORS_ORIGIN}/invite/${rawToken}`;
  try {
    await sendEmail({ to: email, ...inviteEmail(org.name, role ?? "member", link) });
    return true;
  } catch (err) {
    console.error("Failed to send invite email", err);
    return false;
  }
}

export async function createInvite(
  orgId: string,
  input: CreateInviteInput,
  actor: Actor,
  ipAddress?: string
) {
  let projectName: string | null = null;

  if (input.projectId) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project || project.orgId !== orgId) {
      throw new NotFoundError("Project not found");
    }
    projectName = project.name;

    if (actor.role !== "OWNER") {
      const actorGrant = await prisma.projectMembership.findUnique({
        where: { userId_projectId: { userId: actor.id, projectId: input.projectId } },
      });
      if (!actorGrant || actorGrant.role !== "ADMIN") {
        throw new ForbiddenError("Only that project's Admin (or the org Owner) can invite someone to it");
      }
      assertCanAssignRole(actorGrant.role, input.role!);
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

  const rawToken = generateRawToken();
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const inviteRole: ProjectRole = input.role ?? "VIEWER";

  const created = await prisma.$transaction(async (tx) => {
    await tx.orgInvite.deleteMany({
      where: { orgId, email: input.email, acceptedAt: null },
    });

    const invite = await tx.orgInvite.create({
      data: {
        orgId,
        email: input.email,
        role: inviteRole,
        projectId: input.projectId,
        tokenHash,
        invitedById: actor.id,
        approvalStatus: "APPROVED",
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
        role: input.projectId ? inviteRole : null,
        projectId: input.projectId ?? null,
        projectName,
      },
      ipAddress,
    });

    return invite;
  });

  const emailSent = await sendInviteEmail(
    orgId,
    created.email,
    input.projectId ? inviteRole : null,
    rawToken
  );

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
    role: invite.projectId ? invite.role : null,
    email: invite.email,
    project: invite.project ? { id: invite.project.id, name: invite.project.name } : null,
    expiresAt: invite.expiresAt,
    accepted: invite.acceptedAt !== null,
    expired: invite.expiresAt < new Date(),
    pendingApproval: false,
    rejected: false,
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
            role: "VIEWER",
            invitedById: invite.invitedById,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        });

    if (invite.projectId) {
      const existingGrant = await tx.projectMembership.findUnique({
        where: { userId_projectId: { userId: user.id, projectId: invite.projectId } },
      });
      if (!existingGrant) {
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
      metadata: {
        email: invite.email,
        role: invite.projectId ? invite.role : null,
        projectId: invite.projectId,
      },
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
