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

export async function listProjects(orgId: string, accessibleProjectIds: "all" | string[]) {
  const projects = await prisma.project.findMany({
    where:
      accessibleProjectIds === "all"
        ? { orgId }
        : { orgId, id: { in: accessibleProjectIds } },
    orderBy: { createdAt: "asc" },
    include: withEnvironmentCount,
  });

  return projects.map(toProjectResponse);
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
