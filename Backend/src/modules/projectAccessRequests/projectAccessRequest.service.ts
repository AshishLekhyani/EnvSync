import { OrgMembership } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { canBrowseAllProjects, hasProjectAccess } from "../rbac/projectAccess.service";
import { writeAuditLog } from "../audit/audit.service";
import { notifyUserAccessChanged } from "../auth/sse";
import { Actor } from "../orgs/membership.service";

async function resolveApprovers(orgId: string, projectId: string): Promise<string[]> {
  const owners = await prisma.orgMembership.findMany({
    where: { orgId, role: "OWNER" },
    select: { userId: true },
  });

  const admins = await prisma.orgMembership.findMany({
    where: { orgId, role: "ADMIN" },
  });

  const adminApproverIds: string[] = [];
  for (const admin of admins) {
    const allowed = await hasProjectAccess(orgId, admin.userId, projectId, admin.role, admin);
    if (allowed) adminApproverIds.push(admin.userId);
  }

  return [...new Set([...owners.map((o) => o.userId), ...adminApproverIds])];
}

export async function createAccessRequest(
  orgId: string,
  projectId: string,
  actor: Actor,
  ipAddress?: string
) {
  if (!canBrowseAllProjects(actor.role)) {
    throw new ForbiddenError("Your role can't request project access");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.orgId !== orgId) {
    throw new NotFoundError("Project not found");
  }

  const existing = await prisma.projectAccessRequest.findFirst({
    where: { orgId, projectId, requestedById: actor.id, status: "PENDING" },
  });
  if (existing) {
    return existing;
  }

  const request = await prisma.projectAccessRequest.create({
    data: { orgId, projectId, requestedById: actor.id },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId: actor.id,
    action: "project_access.request",
    targetType: "ProjectAccessRequest",
    targetId: request.id,
    projectId,
    metadata: { projectName: project.name },
    ipAddress,
  });

  const approverIds = await resolveApprovers(orgId, projectId);
  if (approverIds.length > 0) {
    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { name: true },
    });
    await prisma.notification.createMany({
      data: approverIds.map((recipientId) => ({
        orgId,
        recipientId,
        type: "project_access.requested",
        message: `${requester.name} requested access to ${project.name}`,
        targetType: "ProjectAccessRequest",
        targetId: request.id,
        metadata: { orgId, requestId: request.id, projectId, projectName: project.name },
      })),
    });
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

async function assertCanDecide(orgId: string, projectId: string, actorMembership: OrgMembership) {
  if (actorMembership.role === "OWNER") return;
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

export async function approveAccessRequest(
  orgId: string,
  requestId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const request = await getPendingRequest(orgId, requestId);
  await assertCanDecide(orgId, request.projectId, actorMembership);

  await prisma.$transaction(async (tx) => {
    await tx.projectMembership.upsert({
      where: {
        userId_projectId: { userId: request.requestedById, projectId: request.projectId },
      },
      create: {
        userId: request.requestedById,
        projectId: request.projectId,
        grantedById: actorMembership.userId,
      },
      update: {},
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
      },
      ipAddress,
    });
  });

  notifyUserAccessChanged(request.requestedById, orgId);
}

export async function rejectAccessRequest(
  orgId: string,
  requestId: string,
  actorMembership: OrgMembership,
  ipAddress?: string
) {
  const request = await getPendingRequest(orgId, requestId);
  await assertCanDecide(orgId, request.projectId, actorMembership);

  await prisma.projectAccessRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED", decidedById: actorMembership.userId, decidedAt: new Date() },
  });

  await writeAuditLog(prisma, {
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
}

export async function listAccessRequests(orgId: string) {
  const requests = await prisma.projectAccessRequest.findMany({
    where: { orgId, status: "PENDING" },
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
    createdAt: r.createdAt,
  }));
}
