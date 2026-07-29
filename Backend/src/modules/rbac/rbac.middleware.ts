import { Request } from "express";
import { OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { asyncHandler } from "../../common/middleware/asyncHandler";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors/AppError";
import { canReadEnvironment, canWriteEnvironment, hasAtLeastRole } from "./roles";

type OrgIdResolver = (req: Request) => Promise<string | null>;

export function requireOrgRole(minRole: OrgRole, resolveOrgId: OrgIdResolver) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const orgId = await resolveOrgId(req);
    if (!orgId) {
      throw new NotFoundError();
    }

    const membership = await prisma.orgMembership.findUnique({
      where: { userId_orgId: { userId: req.user.id, orgId } },
    });

    if (!membership || !hasAtLeastRole(membership.role, minRole)) {
      throw new ForbiddenError();
    }

    req.membership = membership;
    next();
  });
}

export function orgIdFromParam(paramName = "orgId"): OrgIdResolver {
  return async (req) => req.params[paramName] ?? null;
}

export function orgIdFromProjectParam(paramName = "projectId"): OrgIdResolver {
  return async (req) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params[paramName] },
      select: { orgId: true },
    });
    return project?.orgId ?? null;
  };
}

export function orgIdFromEnvironmentParam(
  paramName = "environmentId"
): OrgIdResolver {
  return async (req) => {
    const environment = await prisma.environment.findUnique({
      where: { id: req.params[paramName] },
      select: { project: { select: { orgId: true } } },
    });
    return environment?.project.orgId ?? null;
  };
}

export function orgIdFromSecretParam(paramName = "secretId"): OrgIdResolver {
  return async (req) => {
    const secret = await prisma.secret.findUnique({
      where: { id: req.params[paramName] },
      select: {
        environment: { select: { project: { select: { orgId: true } } } },
      },
    });
    return secret?.environment.project.orgId ?? null;
  };
}

type EnvironmentIdResolver = (req: Request) => Promise<string | null>;

export function requireEnvironmentAccess(
  access: "read" | "write",
  resolveEnvironmentId: EnvironmentIdResolver
) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const environmentId = await resolveEnvironmentId(req);
    if (!environmentId) {
      throw new NotFoundError();
    }

    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: { type: true, project: { select: { orgId: true } } },
    });

    if (!environment) {
      throw new NotFoundError();
    }

    const membership = await prisma.orgMembership.findUnique({
      where: {
        userId_orgId: { userId: req.user.id, orgId: environment.project.orgId },
      },
    });

    if (!membership) {
      throw new ForbiddenError();
    }

    const allowed =
      access === "write"
        ? canWriteEnvironment(membership.role, environment.type)
        : canReadEnvironment(membership.role, environment.type);

    if (!allowed) {
      throw new ForbiddenError();
    }

    req.membership = membership;
    next();
  });
}

export function environmentIdFromParam(
  paramName = "environmentId"
): EnvironmentIdResolver {
  return async (req) => req.params[paramName] ?? null;
}

export function environmentIdFromSecretParam(
  paramName = "secretId"
): EnvironmentIdResolver {
  return async (req) => {
    const secret = await prisma.secret.findUnique({
      where: { id: req.params[paramName] },
      select: { environmentId: true },
    });
    return secret?.environmentId ?? null;
  };
}
