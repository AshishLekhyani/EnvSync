import { OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { notifyUserAccessChanged, notifyUserNotificationCreated } from "../auth/sse";
import { shouldNotify } from "../notifications/notification.service";
import { CreateProjectInput, UpdateProjectInput } from "./project.validators";

const withEnvironmentCount = { _count: { select: { environments: true } } } as const;

function toProjectResponse<T extends { _count: { environments: number } }>(project: T) {
  const { _count, ...rest } = project;
  return { ...rest, environmentCount: _count.environments };
}

async function assertSlugAvailable(orgId: string, slug: string) {
  const existingSlug = await prisma.project.findUnique({
    where: { orgId_slug: { orgId, slug } },
  });

  if (existingSlug) {
    throw new ConflictError(
      "A project with this slug already exists in this organization"
    );
  }
}

async function createProjectRow(
  orgId: string,
  input: { name: string; slug: string; description?: string | null },
  actorId: string,
  ipAddress?: string
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        orgId,
        name: input.name,
        slug: input.slug,
        description: input.description,
      },
      include: withEnvironmentCount,
    });

    await tx.projectMembership.create({
      data: { userId: actorId, projectId: project.id, role: "ADMIN", grantedById: actorId },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "project.create",
      targetType: "Project",
      targetId: project.id,
      projectId: project.id,
      metadata: { name: project.name },
      ipAddress,
    });

    return toProjectResponse(project);
  });
}

export async function createProject(
  orgId: string,
  input: CreateProjectInput,
  actorId: string,
  actorRole: OrgRole,
  ipAddress?: string
) {
  await assertSlugAvailable(orgId, input.slug);

  if (actorRole === "OWNER") {
    return { kind: "created" as const, project: await createProjectRow(orgId, input, actorId, ipAddress) };
  }

  const autoApproved = await prisma.projectCreateAutoApproveRule.findUnique({
    where: { orgId_adminId: { orgId, adminId: actorId } },
  });

  if (autoApproved) {
    return { kind: "created" as const, project: await createProjectRow(orgId, input, actorId, ipAddress) };
  }

  const request = await prisma.projectCreationRequest.create({
    data: {
      orgId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      requestedById: actorId,
    },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId,
    action: "project_creation.request",
    targetType: "ProjectCreationRequest",
    targetId: request.id,
    metadata: { name: input.name },
    ipAddress,
  });

  const owners = await prisma.orgMembership.findMany({
    where: { orgId, role: "OWNER" },
    select: { userId: true },
  });
  const notifiableOwnerIds = (
    await Promise.all(
      owners.map(async (o) => ((await shouldNotify(o.userId, "approvalRequests")) ? o.userId : null))
    )
  ).filter((id): id is string => id !== null);

  if (notifiableOwnerIds.length > 0) {
    const requester = await prisma.user.findUniqueOrThrow({
      where: { id: actorId },
      select: { name: true },
    });
    await prisma.notification.createMany({
      data: notifiableOwnerIds.map((recipientId) => ({
        orgId,
        recipientId,
        type: "project_creation.requested",
        message: `${requester.name} wants to create the project "${input.name}"`,
        targetType: "ProjectCreationRequest",
        targetId: request.id,
        metadata: { orgId, requestId: request.id, name: input.name },
      })),
    });
    for (const recipientId of notifiableOwnerIds) {
      notifyUserNotificationCreated(recipientId);
    }
  }

  return { kind: "pending" as const, request };
}

async function getPendingCreationRequest(orgId: string, requestId: string) {
  const request = await prisma.projectCreationRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: { select: { id: true, name: true, email: true } } },
  });
  if (!request || request.orgId !== orgId) {
    throw new NotFoundError("Project creation request not found");
  }
  if (request.status !== "PENDING") {
    throw new ConflictError("This request has already been decided");
  }
  return request;
}

export async function approveProjectCreationRequest(
  orgId: string,
  requestId: string,
  actorId: string,
  ipAddress?: string
) {
  const request = await getPendingCreationRequest(orgId, requestId);
  await assertSlugAvailable(orgId, request.slug);
  const notify = await shouldNotify(request.requestedById, "accessChanges");

  const project = await createProjectRow(
    orgId,
    { name: request.name, slug: request.slug, description: request.description },
    request.requestedById,
    ipAddress
  );

  await prisma.projectCreationRequest.update({
    where: { id: request.id },
    data: { status: "APPROVED", decidedById: actorId, decidedAt: new Date() },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId,
    action: "project_creation.approve",
    targetType: "ProjectCreationRequest",
    targetId: request.id,
    projectId: project.id,
    metadata: { name: request.name, requesterEmail: request.requestedBy.email },
    ipAddress,
  });

  if (notify) {
    await prisma.notification.create({
      data: {
        orgId,
        recipientId: request.requestedById,
        type: "project_creation.approved",
        message: `Your project "${request.name}" was approved and created`,
        targetType: "Project",
        targetId: project.id,
        metadata: { orgId },
      },
    });
    notifyUserNotificationCreated(request.requestedById);
  }
  notifyUserAccessChanged(request.requestedById, orgId, project.id);

  return project;
}

export async function rejectProjectCreationRequest(
  orgId: string,
  requestId: string,
  actorId: string,
  ipAddress?: string
) {
  const request = await getPendingCreationRequest(orgId, requestId);
  const notify = await shouldNotify(request.requestedById, "accessChanges");

  await prisma.projectCreationRequest.update({
    where: { id: request.id },
    data: { status: "REJECTED", decidedById: actorId, decidedAt: new Date() },
  });

  await writeAuditLog(prisma, {
    orgId,
    actorId,
    action: "project_creation.reject",
    targetType: "ProjectCreationRequest",
    targetId: request.id,
    metadata: { name: request.name, requesterEmail: request.requestedBy.email },
    ipAddress,
  });

  if (notify) {
    await prisma.notification.create({
      data: {
        orgId,
        recipientId: request.requestedById,
        type: "project_creation.rejected",
        message: `Your project "${request.name}" request was rejected`,
        targetType: "ProjectCreationRequest",
        targetId: request.id,
        metadata: { orgId },
      },
    });
    notifyUserNotificationCreated(request.requestedById);
  }
}

export async function listProjectCreationRequests(orgId: string) {
  const requests = await prisma.projectCreationRequest.findMany({
    where: { orgId, status: "PENDING" },
    include: { requestedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return requests;
}

export async function listCreateAutoApproveRules(orgId: string) {
  const rules = await prisma.projectCreateAutoApproveRule.findMany({
    where: { orgId },
    include: { admin: { select: { id: true, name: true, email: true } } },
  });
  return rules.map((r) => ({ id: r.id, admin: r.admin, createdAt: r.createdAt }));
}

export async function enableCreateAutoApprove(
  orgId: string,
  adminId: string,
  actorId: string
) {
  await prisma.projectCreateAutoApproveRule.upsert({
    where: { orgId_adminId: { orgId, adminId } },
    create: { orgId, adminId, createdById: actorId },
    update: {},
  });
}

export async function disableCreateAutoApprove(orgId: string, adminId: string) {
  await prisma.projectCreateAutoApproveRule.deleteMany({ where: { orgId, adminId } });
}

export async function listProjects(
  orgId: string,
  accessibleProjectIds: "all" | string[],
  browseAll = false,
  userId?: string,
  orgRole?: OrgRole
) {
  const canSeeAll = accessibleProjectIds === "all";

  const projects = await prisma.project.findMany({
    where: canSeeAll || browseAll ? { orgId } : { orgId, id: { in: accessibleProjectIds } },
    orderBy: { createdAt: "asc" },
    include: withEnvironmentCount,
  });

  const accessibleSet = canSeeAll ? null : new Set(accessibleProjectIds);

  let pendingRequestSet: Set<string> | null = null;
  if (browseAll && !canSeeAll && userId) {
    const pending = await prisma.projectAccessRequest.findMany({
      where: { orgId, requestedById: userId, status: "PENDING" },
      select: { projectId: true },
    });
    pendingRequestSet = new Set(pending.map((p) => p.projectId));
  }

  let roleByProjectId: Map<string, OrgRole> | null = null;
  if (userId && orgRole && orgRole !== "OWNER") {
    const grants = await prisma.projectMembership.findMany({
      where: { userId, project: { orgId } },
      select: { projectId: true, role: true },
    });
    roleByProjectId = new Map(grants.map((g) => [g.projectId, g.role]));
  }

  return projects.map((project) => ({
    ...toProjectResponse(project),
    hasAccess: accessibleSet ? accessibleSet.has(project.id) : true,
    hasPendingAccessRequest: pendingRequestSet ? pendingRequestSet.has(project.id) : false,
    myRole: orgRole === "OWNER" ? "OWNER" : (roleByProjectId?.get(project.id) ?? null),
  }));
}

export async function getProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: withEnvironmentCount,
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  return toProjectResponse(project);
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
  actorId: string,
  ipAddress?: string
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: projectId },
      data: { name: input.name, description: input.description },
      include: withEnvironmentCount,
    });

    await writeAuditLog(tx, {
      orgId: project.orgId,
      actorId,
      action: "project.update",
      targetType: "Project",
      targetId: projectId,
      projectId,
      metadata: {
        previousName: project.name,
        newName: updated.name,
        previousDescription: project.description,
        newDescription: updated.description,
      },
      ipAddress,
    });

    return toProjectResponse(updated);
  });
}

export async function deleteProject(
  projectId: string,
  actorId: string,
  ipAddress?: string
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      orgId: project.orgId,
      actorId,
      action: "project.delete",
      targetType: "Project",
      targetId: projectId,
      metadata: { name: project.name },
      ipAddress,
    });

    await tx.project.delete({ where: { id: projectId } });
  });
}
