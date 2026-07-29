import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { CreateEnvironmentInput } from "./environment.validators";

function defaultName(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export async function createEnvironment(
  projectId: string,
  input: CreateEnvironmentInput,
  actorId: string,
  ipAddress?: string
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const existing = await prisma.environment.findUnique({
    where: { projectId_type: { projectId, type: input.type } },
  });

  if (existing) {
    throw new ConflictError(
      `A ${input.type} environment already exists for this project`
    );
  }

  return prisma.$transaction(async (tx) => {
    const environment = await tx.environment.create({
      data: {
        projectId,
        type: input.type,
        name: input.name ?? defaultName(input.type),
      },
    });

    await writeAuditLog(tx, {
      orgId: project.orgId,
      actorId,
      action: "environment.create",
      targetType: "Environment",
      targetId: environment.id,
      projectId,
      metadata: { type: input.type },
      ipAddress,
    });

    return environment;
  });
}

export async function listEnvironments(projectId: string) {
  return prisma.environment.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getEnvironment(environmentId: string) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
  });

  if (!environment) {
    throw new NotFoundError("Environment not found");
  }

  return environment;
}

export async function deleteEnvironment(
  environmentId: string,
  actorId: string,
  ipAddress?: string
) {
  const environment = await prisma.environment.findUnique({
    where: { id: environmentId },
    include: { project: true },
  });

  if (!environment) {
    throw new NotFoundError("Environment not found");
  }

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      orgId: environment.project.orgId,
      actorId,
      action: "environment.delete",
      targetType: "Environment",
      targetId: environmentId,
      projectId: environment.projectId,
      metadata: { type: environment.type },
      ipAddress,
    });

    await tx.environment.delete({ where: { id: environmentId } });
  });
}
