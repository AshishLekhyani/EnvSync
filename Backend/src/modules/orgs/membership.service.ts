import { OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { hasAtLeastRole } from "../rbac/roles";
import { writeAuditLog } from "../audit/audit.service";
import { AddMemberInput, UpdateMemberRoleInput } from "./membership.validators";

export interface Actor {
  id: string;
  role: OrgRole;
}

export function assertCanAssignRole(actorRole: OrgRole, targetRole: OrgRole) {
  if (targetRole === "OWNER" && actorRole !== "OWNER") {
    throw new ForbiddenError("Only an owner can grant the owner role");
  }
  if (!hasAtLeastRole(actorRole, targetRole)) {
    throw new ForbiddenError("Cannot assign a role higher than your own");
  }
}

export async function listMembers(orgId: string) {
  const memberships = await prisma.orgMembership.findMany({
    where: { orgId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    user: m.user,
  }));
}

export async function addMember(
  orgId: string,
  input: AddMemberInput,
  actor: Actor,
  ipAddress?: string
) {
  assertCanAssignRole(actor.role, input.role);

  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    throw new NotFoundError("No registered user with this email");
  }

  const existing = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });

  if (existing) {
    throw new ConflictError("User is already a member of this organization");
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.orgMembership.create({
      data: { userId: user.id, orgId, role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "member.add",
      targetType: "OrgMembership",
      targetId: membership.id,
      metadata: { email: user.email, role: input.role },
      ipAddress,
    });

    return membership;
  });
}

export async function updateMemberRole(
  orgId: string,
  membershipId: string,
  input: UpdateMemberRoleInput,
  actor: Actor,
  ipAddress?: string
) {
  assertCanAssignRole(actor.role, input.role);

  const membership = await prisma.orgMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.orgId !== orgId) {
    throw new NotFoundError("Membership not found");
  }

  if (membership.role === "OWNER" && actor.role !== "OWNER") {
    throw new ForbiddenError("Only an owner can change another owner's role");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.orgMembership.update({
      where: { id: membershipId },
      data: { role: input.role },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "member.role_change",
      targetType: "OrgMembership",
      targetId: membershipId,
      metadata: { newRole: input.role, previousRole: membership.role },
      ipAddress,
    });

    return updated;
  });
}

export async function removeMember(
  orgId: string,
  membershipId: string,
  actor: Actor,
  ipAddress?: string
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership || membership.orgId !== orgId) {
    throw new NotFoundError("Membership not found");
  }

  if (membership.role === "OWNER" && membership.userId !== actor.id) {
    throw new ForbiddenError("Owners can only be removed by themselves");
  }

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "member.remove",
      targetType: "OrgMembership",
      targetId: membershipId,
      metadata: { removedUserId: membership.userId, role: membership.role },
      ipAddress,
    });

    await tx.orgMembership.delete({ where: { id: membershipId } });
  });
}
