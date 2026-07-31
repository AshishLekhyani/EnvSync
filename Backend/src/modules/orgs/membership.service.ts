import { OrgMembership, OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { ROLE_WEIGHT } from "../rbac/roles";
import { hasProjectAccess } from "../rbac/projectAccess.service";
import { writeAuditLog } from "../audit/audit.service";
import { notifyUserAccessChanged, notifyUserNotificationCreated } from "../auth/sse";
import { shouldNotify } from "../notifications/notification.service";
import { AddMemberInput, UpdateMemberRoleInput } from "./membership.validators";

export interface Actor {
  id: string;
  role: OrgRole;
}

export function assertCanAssignRole(actorRole: OrgRole, targetRole: OrgRole) {
  if (actorRole === "OWNER") return;
  if (ROLE_WEIGHT[targetRole] >= ROLE_WEIGHT[actorRole]) {
    throw new ForbiddenError("You can only assign a role below your own");
  }
}

export async function listMembers(
  orgId: string,
  accessibleProjectIds: "all" | string[],
  userId: string
) {
  const canSeeAll = accessibleProjectIds === "all";

  const memberships = await prisma.orgMembership.findMany({
    where: canSeeAll
      ? { orgId }
      : {
          orgId,
          OR: [
            { role: "OWNER" },
            { canViewAllProjects: true },
            { userId },
            {
              user: {
                projectAccess: { some: { projectId: { in: accessibleProjectIds } } },
              },
            },
          ],
        },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  if (!canSeeAll) {
    return memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      user: m.user,
    }));
  }

  const grants = await prisma.projectMembership.findMany({
    where: { project: { orgId } },
    include: { project: { select: { id: true, name: true } } },
  });
  const grantsByUser = new Map<string, { id: string; name: string }[]>();
  for (const g of grants) {
    const list = grantsByUser.get(g.userId) ?? [];
    list.push(g.project);
    grantsByUser.set(g.userId, list);
  }

  return memberships.map((m) => ({
    membershipId: m.id,
    role: m.role,
    user: m.user,
    canViewAllProjects: m.canViewAllProjects,
    projectAccess: grantsByUser.get(m.userId) ?? [],
  }));
}

export async function grantProjectAccess(
  orgId: string,
  membershipId: string,
  projectId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });
  if (!membership || membership.orgId !== orgId) {
    throw new NotFoundError("Membership not found");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.orgId !== orgId) {
    throw new NotFoundError("Project not found");
  }

  if (actorMembership.role !== "OWNER") {
    const allowed = await hasProjectAccess(
      orgId,
      actorMembership.userId,
      projectId,
      actorMembership.role,
      actorMembership
    );
    if (!allowed) {
      throw new ForbiddenError("You don't have access to this project yourself");
    }
  }

  await prisma.projectMembership.upsert({
    where: { userId_projectId: { userId: membership.userId, projectId } },
    create: { userId: membership.userId, projectId, grantedById: actorMembership.userId },
    update: {},
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: actorMembership.userId,
    action: "member.project_access_grant",
    targetType: "ProjectMembership",
    targetId: membershipId,
    projectId,
    metadata: {
      targetUserId: membership.userId,
      targetUserEmail: membership.user.email,
      projectId,
      projectName: project.name,
    },
    ipAddress,
  });

  notifyUserAccessChanged(membership.userId, orgId);
}

export async function revokeProjectAccess(
  orgId: string,
  membershipId: string,
  projectId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });
  if (!membership || membership.orgId !== orgId) {
    throw new NotFoundError("Membership not found");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (actorMembership.role !== "OWNER") {
    const allowed = await hasProjectAccess(
      orgId,
      actorMembership.userId,
      projectId,
      actorMembership.role,
      actorMembership
    );
    if (!allowed) {
      throw new ForbiddenError("You don't have access to this project yourself");
    }
  }

  await prisma.projectMembership.deleteMany({
    where: { userId: membership.userId, projectId },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: actorMembership.userId,
    action: "member.project_access_revoke",
    targetType: "ProjectMembership",
    targetId: membershipId,
    projectId,
    metadata: {
      targetUserId: membership.userId,
      targetUserEmail: membership.user.email,
      projectId,
      projectName: project?.name ?? null,
    },
    ipAddress,
  });

  notifyUserAccessChanged(membership.userId, orgId);
}

export async function setCanViewAllProjects(
  orgId: string,
  membershipId: string,
  value: boolean,
  actorId: string,
  ipAddress?: string
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
  });
  if (!membership || membership.orgId !== orgId) {
    throw new NotFoundError("Membership not found");
  }

  if (membership.role === "OWNER") {
    throw new ForbiddenError("Owners already have full access");
  }

  const updated = await prisma.orgMembership.update({
    where: { id: membershipId },
    data: { canViewAllProjects: value },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId,
    action: "member.view_all_set",
    targetType: "OrgMembership",
    targetId: membershipId,
    metadata: {
      targetUserId: membership.userId,
      targetUserEmail: membership.user.email,
      canViewAllProjects: value,
    },
    ipAddress,
  });

  notifyUserAccessChanged(membership.userId, orgId);

  return updated;
}

export async function addMember(
  orgId: string,
  input: AddMemberInput,
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
      data: { userId: user.id, orgId, role: input.role, invitedById: actor.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (input.projectId) {
      await tx.projectMembership.create({
        data: { userId: user.id, projectId: input.projectId, grantedById: actor.id },
      });
    }

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "member.add",
      targetType: "OrgMembership",
      targetId: membership.id,
      projectId: input.projectId,
      metadata: { email: user.email, role: input.role, projectId: input.projectId ?? null },
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
    include: { user: { select: { email: true } } },
  });

  if (!membership || membership.orgId !== orgId) {
    throw new NotFoundError("Membership not found");
  }

  if (membership.role === "OWNER" && actor.role !== "OWNER") {
    throw new ForbiddenError("Only an owner can change another owner's role");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.orgMembership.update({
      where: { id: membershipId },
      data: { role: input.role },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actor.id,
      action: "member.role_change",
      targetType: "OrgMembership",
      targetId: membershipId,
      metadata: {
        email: membership.user.email,
        newRole: input.role,
        previousRole: membership.role,
      },
      ipAddress,
    });

    return result;
  });

  notifyUserAccessChanged(membership.userId, orgId);

  return updated;
}

export async function removeMember(
  orgId: string,
  membershipId: string,
  actor: Actor,
  ipAddress?: string
) {
  const membership = await prisma.orgMembership.findUnique({
    where: { id: membershipId },
    include: { user: { select: { email: true } } },
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
      metadata: {
        removedUserId: membership.userId,
        email: membership.user.email,
        role: membership.role,
      },
      ipAddress,
    });

    await tx.orgMembership.delete({ where: { id: membershipId } });
  });

  notifyUserAccessChanged(membership.userId, orgId);
}

export async function leaveOrganization(orgId: string, userId: string, ipAddress?: string) {
  const membership = await prisma.orgMembership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    include: { user: { select: { email: true } } },
  });

  if (!membership) {
    throw new NotFoundError("Membership not found");
  }

  if (membership.role === "OWNER") {
    const otherMembers = await prisma.orgMembership.count({
      where: { orgId, userId: { not: userId } },
    });

    if (otherMembers > 0) {
      throw new ConflictError(
        "You're the sole owner of this organization. Transfer ownership to someone else or delete the organization before leaving."
      );
    }

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    await prisma.$transaction(async (tx) => {
      await writeAuditLog(tx, {
        orgId,
        actorId: userId,
        action: "org.delete",
        targetType: "Organization",
        targetId: orgId,
        metadata: { name: org.name, reason: "sole_owner_left" },
        ipAddress,
      });
      await tx.organization.delete({ where: { id: orgId } });
    });
    notifyUserAccessChanged(userId, orgId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      orgId,
      actorId: userId,
      action: "member.leave",
      targetType: "OrgMembership",
      targetId: membership.id,
      metadata: { email: membership.user.email, role: membership.role },
      ipAddress,
    });

    await tx.orgMembership.delete({ where: { id: membership.id } });
  });
  notifyUserAccessChanged(userId, orgId);
}

export async function transferOwnership(
  orgId: string,
  targetMembershipId: string,
  actorId: string,
  ipAddress?: string
) {
  const [actorMembership, targetMembership] = await Promise.all([
    prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId: actorId, orgId } },
      include: { user: { select: { email: true } } },
    }),
    prisma.orgMembership.findUnique({
      where: { id: targetMembershipId },
      include: { user: { select: { email: true } } },
    }),
  ]);

  if (!actorMembership) {
    throw new NotFoundError("Membership not found");
  }
  if (!targetMembership || targetMembership.orgId !== orgId) {
    throw new NotFoundError("Target member not found");
  }
  if (targetMembership.userId === actorId) {
    throw new BadRequestError("You're already the owner");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const notifyNewOwner = await shouldNotify(targetMembership.userId, "accessChanges");

  await prisma.$transaction(async (tx) => {
    await tx.orgMembership.update({
      where: { id: actorMembership.id },
      data: { role: "ADMIN" },
    });
    await tx.orgMembership.update({
      where: { id: targetMembership.id },
      data: { role: "OWNER" },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "org.ownership_transfer",
      targetType: "OrgMembership",
      targetId: targetMembership.id,
      metadata: {
        previousOwnerEmail: actorMembership.user.email,
        newOwnerEmail: targetMembership.user.email,
      },
      ipAddress,
    });

    if (notifyNewOwner) {
      await tx.notification.create({
        data: {
          orgId,
          recipientId: targetMembership.userId,
          type: "org.ownership_transferred",
          message: `You are now the Owner of ${org.name}`,
          targetType: "Organization",
          targetId: orgId,
          metadata: { orgId },
        },
      });
    }
  });

  notifyUserAccessChanged(actorMembership.userId, orgId);
  notifyUserAccessChanged(targetMembership.userId, orgId);
  if (notifyNewOwner) notifyUserNotificationCreated(targetMembership.userId);
}

export async function leaveProject(
  orgId: string,
  projectId: string,
  userId: string,
  ipAddress?: string
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.orgId !== orgId) {
    throw new NotFoundError("Project not found");
  }

  await prisma.projectMembership.deleteMany({
    where: { userId, projectId },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: userId,
    action: "member.project_access_revoke",
    targetType: "ProjectMembership",
    projectId,
    metadata: { targetUserId: userId, projectId, projectName: project.name, reason: "left_voluntarily" },
    ipAddress,
  });

  notifyUserAccessChanged(userId, orgId, projectId);
}
