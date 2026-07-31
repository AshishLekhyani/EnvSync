import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { CreateProjectInput, UpdateProjectInput } from "./project.validators";

const withEnvironmentCount = { _count: { select: { environments: true } } } as const;

function toProjectResponse<T extends { _count: { environments: number } }>(project: T) {
  const { _count, ...rest } = project;
  return { ...rest, environmentCount: _count.environments };
}

export async function createProject(
  orgId: string,
  input: CreateProjectInput,
  actorId: string,
  ipAddress?: string
) {
  const existingSlug = await prisma.project.findUnique({
    where: { orgId_slug: { orgId, slug: input.slug } },
  });

  if (existingSlug) {
    throw new ConflictError(
      "A project with this slug already exists in this organization"
    );
  }

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
      data: { userId: actorId, projectId: project.id, grantedById: actorId },
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

export async function listProjects(
  orgId: string,
  accessibleProjectIds: "all" | string[],
  browseAll = false,
  userId?: string
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

  return projects.map((project) => ({
    ...toProjectResponse(project),
    hasAccess: accessibleSet ? accessibleSet.has(project.id) : true,
    hasPendingAccessRequest: pendingRequestSet ? pendingRequestSet.has(project.id) : false,
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
