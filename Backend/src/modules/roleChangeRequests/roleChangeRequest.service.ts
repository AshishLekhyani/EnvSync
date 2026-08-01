import { OrgMembership, OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { notifyUserAccessChanged, notifyUserNotificationCreated } from "../auth/sse";
import { shouldNotify } from "../notifications/notification.service";
import { Actor, assertCanAssignRole } from "../orgs/membership.service";
import { ROLE_WEIGHT } from "../rbac/roles";

async function resolveApprovers(orgId: string, requestedRole: OrgRole): Promise<string[]> {
  const candidates = await prisma.orgMembership.findMany({
    where: { orgId, role: { in: ["OWNER", "ADMIN"] } },
  });

  return candidates
    .filter((m) => {
      try {
        assertCanAssignRole(m.role, requestedRole);
        return true;
      } catch {
        return false;
      }
    })
    .map((m) => m.userId);
}

export async function createRoleChangeRequest(
  orgId: string,
  actor: Actor,
  requestedRole: OrgRole,
  ipAddress?: string
) {
  if (ROLE_WEIGHT[requestedRole] <= ROLE_WEIGHT[actor.role]) {
    throw new ForbiddenError("The requested role must be above your current role");
  }

  const existing = await prisma.roleChangeRequest.findFirst({
    where: { orgId, userId: actor.id, status: "PENDING" },
  });
  if (existing) {
    return existing;
  }

  const request = await prisma.roleChangeRequest.create({
    data: { orgId, userId: actor.id, requestedRole },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: actor.id,
    action: "role_change.request",
    targetType: "RoleChangeRequest",
    targetId: request.id,
    metadata: { requestedRole, currentRole: actor.role },
    ipAddress,
  });

  let approverIds = await resolveApprovers(orgId, requestedRole);
  const notifiable = await Promise.all(
    approverIds.map(async (id) => ((await shouldNotify(id, "approvalRequests")) ? id : null))
  );
  approverIds = notifiable.filter((id): id is string => id !== null);

  if (approverIds.length > 0) {
    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { name: true },
    });
    await prisma.notification.createMany({
      data: approverIds.map((recipientId) => ({
        orgId,
        recipientId,
        type: "role_change.requested",
        message: `${requester.name} requested to become ${requestedRole}`,
        targetType: "RoleChangeRequest",
        targetId: request.id,
        metadata: { orgId, requestId: request.id },
      })),
    });
    for (const recipientId of approverIds) {
      notifyUserNotificationCreated(recipientId);
    }
  }

  return request;
}

async function getPendingRequest(orgId: string, requestId: string) {
  const request = await prisma.roleChangeRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!request || request.orgId !== orgId) {
    throw new NotFoundError("Role change request not found");
  }
  if (request.status !== "PENDING") {
    throw new ConflictError("This request has already been decided");
  }
  return request;
}

export async function approveRoleChangeRequest(
  orgId: string,
  requestId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const request = await getPendingRequest(orgId, requestId);
  assertCanAssignRole(actorMembership.role, request.requestedRole);
  const notify = await shouldNotify(request.userId, "accessChanges");

  const requesterMembership = await prisma.orgMembership.findUniqueOrThrow({
    where: { userId_orgId: { userId: request.userId, orgId } },
  });

  await prisma.$transaction(async (tx) => {
    await tx.orgMembership.update({
      where: { id: requesterMembership.id },
      data: { role: request.requestedRole },
    });

    await tx.roleChangeRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED", decidedById: actorMembership.userId, decidedAt: new Date() },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actorMembership.userId,
      action: "member.role_change",
      targetType: "OrgMembership",
      targetId: requesterMembership.id,
      metadata: {
        email: request.user.email,
        previousRole: requesterMembership.role,
        newRole: request.requestedRole,
      },
      ipAddress,
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actorMembership.userId,
      action: "role_change.approve",
      targetType: "RoleChangeRequest",
      targetId: request.id,
      metadata: { email: request.user.email, requestedRole: request.requestedRole },
      ipAddress,
    });

    if (notify) {
      await tx.notification.create({
        data: {
          orgId,
          recipientId: request.userId,
          type: "role_change.approved",
          message: `Your request to become ${request.requestedRole} was approved`,
          targetType: "OrgMembership",
          targetId: requesterMembership.id,
          metadata: { orgId },
        },
      });
    }
  });

  notifyUserAccessChanged(request.userId, orgId);
  if (notify) notifyUserNotificationCreated(request.userId);
}

export async function rejectRoleChangeRequest(
  orgId: string,
  requestId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const request = await getPendingRequest(orgId, requestId);
  const notify = await shouldNotify(request.userId, "accessChanges");

  await prisma.$transaction(async (tx) => {
    await tx.roleChangeRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", decidedById: actorMembership.userId, decidedAt: new Date() },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId: actorMembership.userId,
      action: "role_change.reject",
      targetType: "RoleChangeRequest",
      targetId: request.id,
      metadata: { email: request.user.email, requestedRole: request.requestedRole },
      ipAddress,
    });

    if (notify) {
      await tx.notification.create({
        data: {
          orgId,
          recipientId: request.userId,
          type: "role_change.rejected",
          message: `Your request to become ${request.requestedRole} was rejected`,
          targetType: "OrgMembership",
          targetId: request.userId,
          metadata: { orgId },
        },
      });
    }
  });

  if (notify) notifyUserNotificationCreated(request.userId);
}

export async function listRoleChangeRequests(orgId: string) {
  const requests = await prisma.roleChangeRequest.findMany({
    where: { orgId, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    user: r.user,
    requestedRole: r.requestedRole,
    createdAt: r.createdAt,
  }));
}

export async function getMyPendingRequest(orgId: string, userId: string) {
  return prisma.roleChangeRequest.findFirst({
    where: { orgId, userId, status: "PENDING" },
  });
}
