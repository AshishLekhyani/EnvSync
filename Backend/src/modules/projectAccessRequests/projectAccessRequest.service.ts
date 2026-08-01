import { OrgMembership, OrgRole, ProjectRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { canBrowseAllProjects } from "../rbac/projectAccess.service";
import { writeAuditLog } from "../audit/audit.service";
import { notifyUserAccessChanged, notifyUserNotificationCreated } from "../auth/sse";
import { shouldNotify } from "../notifications/notification.service";
import { Actor, assertCanAssignRole } from "../orgs/membership.service";
import { hasAtLeastRole, ROLE_WEIGHT } from "../rbac/roles";

async function resolveApprovers(orgId: string, projectId: string): Promise<string[]> {
  const owners = await prisma.orgMembership.findMany({
    where: { orgId, role: "OWNER" },
    select: { userId: true },
  });

  const projectAdmins = await prisma.projectMembership.findMany({
    where: { projectId, role: "ADMIN" },
    select: { userId: true },
  });

  return [...new Set([...owners.map((o) => o.userId), ...projectAdmins.map((a) => a.userId)])];
}

export async function createAccessRequest(
  orgId: string,
  projectId: string,
  actor: Actor,
  requestedRole: ProjectRole | null,
  ipAddress?: string
) {
  if (actor.role !== "OWNER" && !canBrowseAllProjects(actor.role)) {
    throw new ForbiddenError("Your role can't request project access");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.orgId !== orgId) {
    throw new NotFoundError("Project not found");
  }

  if (requestedRole) {
    const currentGrant = await prisma.projectMembership.findUnique({
      where: { userId_projectId: { userId: actor.id, projectId } },
    });
    const currentWeight = currentGrant ? ROLE_WEIGHT[currentGrant.role] : 0;
    if (ROLE_WEIGHT[requestedRole] <= currentWeight) {
      throw new ForbiddenError("The requested role must be above your current role in this project");
    }
  }

  const existing = await prisma.projectAccessRequest.findFirst({
    where: { orgId, projectId, requestedById: actor.id, status: "PENDING" },
  });
  if (existing) {
    return existing;
  }

  const request = await prisma.projectAccessRequest.create({
    data: { orgId, projectId, requestedById: actor.id, requestedRole: requestedRole ?? undefined },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: actor.id,
    action: "project_access.request",
    targetType: "ProjectAccessRequest",
    targetId: request.id,
    projectId,
    metadata: { projectName: project.name, requestedRole: requestedRole ?? null },
    ipAddress,
  });

  let approverIds = await resolveApprovers(orgId, projectId);
  const notifiable = await Promise.all(
    approverIds.map(async (id) => ((await shouldNotify(id, "approvalRequests")) ? id : null))
  );
  approverIds = notifiable.filter((id): id is string => id !== null);

  if (approverIds.length > 0) {
    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { name: true },
    });
    const roleSuffix = requestedRole ? ` as ${requestedRole}` : "";
    await prisma.notification.createMany({
      data: approverIds.map((recipientId) => ({
        orgId,
        recipientId,
        type: "project_access.requested",
        message: `${requester.name} requested access to ${project.name}${roleSuffix}`,
        targetType: "ProjectAccessRequest",
        targetId: request.id,
        metadata: { orgId, requestId: request.id, projectId, projectName: project.name },
      })),
    });
    for (const recipientId of approverIds) {
      notifyUserNotificationCreated(recipientId);
    }
  }

  return request;
}

async function getPendingRequest(orgId: string, requestId: string) {
  const request = await prisma.projectAccessRequest.findUnique({
    where: { id: requestId },
    include: {
      project: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, email: true } },
    },
  });
  if (!request || request.orgId !== orgId) {
    throw new NotFoundError("Access request not found");
  }
  if (request.status !== "PENDING") {
    throw new ConflictError("This request has already been decided");
  }
  return request;
}

async function assertCanDecide(
  orgId: string,
  projectId: string,
  actorMembership: OrgMembership,
  requestedRole: ProjectRole | null
) {
  if (actorMembership.role === "OWNER") return;

  const actorGrant = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId: actorMembership.userId, projectId } },
  });
  if (!actorGrant || !hasAtLeastRole(actorGrant.role, "ADMIN")) {
    throw new ForbiddenError("You need Admin access to this project to decide this request");
  }

  if (requestedRole) {
    assertCanAssignRole(actorGrant.role, requestedRole);
  }
}

export async function approveAccessRequest(
  orgId: string,
  requestId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const request = await getPendingRequest(orgId, requestId);
  await assertCanDecide(orgId, request.projectId, actorMembership, request.requestedRole);
  const notify = await shouldNotify(request.requestedById, "accessChanges");

  const existingGrant = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId: request.requestedById, projectId: request.projectId } },
  });
  const grantedRole = request.requestedRole ?? existingGrant?.role ?? "VIEWER";
  const roleChanged = !existingGrant || existingGrant.role !== grantedRole;

  await prisma.$transaction(async (tx) => {
    await tx.projectMembership.upsert({
      where: {
        userId_projectId: { userId: request.requestedById, projectId: request.projectId },
      },
      create: {
        userId: request.requestedById,
        projectId: request.projectId,
        role: grantedRole,
        grantedById: actorMembership.userId,
      },
      update: { role: grantedRole },
    });

    await tx.projectAccessRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", decidedById: actorMembership.userId, decidedAt: new Date() },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actorMembership.userId,
      action: "project_access.approve",
      targetType: "ProjectAccessRequest",
      targetId: request.id,
      projectId: request.projectId,
      metadata: {
        projectName: request.project.name,
        requesterEmail: request.requestedBy.email,
        grantedRole,
        roleChanged,
      },
      ipAddress,
    });

    if (notify) {
      const roleNote = roleChanged ? ` (as ${grantedRole})` : "";
      await tx.notification.create({
        data: {
          orgId,
          recipientId: request.requestedById,
          type: "project_access.approved",
          message: `Your request for access to ${request.project.name} was approved${roleNote}`,
          targetType: "Project",
          targetId: request.projectId,
          metadata: { orgId, requestId: request.id, projectId: request.projectId },
        },
      });
    }
  });

  notifyUserAccessChanged(request.requestedById, orgId, request.projectId);
  if (notify) notifyUserNotificationCreated(request.requestedById);
}

export async function rejectAccessRequest(
  orgId: string,
  requestId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const request = await getPendingRequest(orgId, requestId);
  await assertCanDecide(orgId, request.projectId, actorMembership, null);
  const notify = await shouldNotify(request.requestedById, "accessChanges");

  await prisma.$transaction(async (tx) => {
    await tx.projectAccessRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", decidedById: actorMembership.userId, decidedAt: new Date() },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actorMembership.userId,
      action: "project_access.reject",
      targetType: "ProjectAccessRequest",
      targetId: request.id,
      projectId: request.projectId,
      metadata: {
        projectName: request.project.name,
        requesterEmail: request.requestedBy.email,
      },
      ipAddress,
    });

    if (notify) {
      await tx.notification.create({
        data: {
          orgId,
          recipientId: request.requestedById,
          type: "project_access.rejected",
          message: `Your request for access to ${request.project.name} was rejected`,
          targetType: "Project",
          targetId: request.projectId,
          metadata: { orgId, requestId: request.id, projectId: request.projectId },
        },
      });
    }
  });

  if (notify) notifyUserNotificationCreated(request.requestedById);
}

export async function listAccessRequests(orgId: string, userId: string, orgRole: OrgRole) {
  const where =
    orgRole === "OWNER"
      ? { orgId, status: "PENDING" as const }
      : {
          orgId,
          status: "PENDING" as const,
          project: { memberships: { some: { userId, role: "ADMIN" as const } } },
        };

  const requests = await prisma.projectAccessRequest.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    project: r.project,
    requestedBy: r.requestedBy,
    requestedRole: r.requestedRole,
    createdAt: r.createdAt,
  }));
}
