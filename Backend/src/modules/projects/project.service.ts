import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { CreateProjectInput, UpdateProjectInput } from "./project.validators";

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
    });

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "project.create",
      targetType: "Project",
      targetId: project.id,
      projectId: project.id,
      ipAddress,
    });

    return project;
  });
}

export async function listProjects(orgId: string) {
  return prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProject(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  return project;
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
    });

    await writeAuditLog(tx, {
      orgId: project.orgId,
      actorId,
      action: "project.update",
      targetType: "Project",
      targetId: projectId,
      projectId,
      ipAddress,
    });

    return updated;
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
      ipAddress,
    });

    await tx.project.delete({ where: { id: projectId } });
  });
}
