import { EnvironmentAccessLevel, EnvironmentType, OrgRole, ProjectRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ForbiddenError } from "../../common/errors/AppError";
import { writeAuditLog } from "../audit/audit.service";
import { EnvironmentAccess, getEnvironmentAccess } from "./roles";

const ALL_ROLES: ProjectRole[] = ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"];
const ALL_ENV_TYPES: EnvironmentType[] = [
  "DEVELOPMENT",
  "TESTING",
  "STAGING",
  "PRODUCTION",
];

function toLowerAccess(access: EnvironmentAccessLevel): EnvironmentAccess {
  return access.toLowerCase() as EnvironmentAccess;
}

function toUpperAccess(access: EnvironmentAccess): EnvironmentAccessLevel {
  return access.toUpperCase() as EnvironmentAccessLevel;
}

async function getEffectiveAccessForRole(
  orgId: string,
  role: ProjectRole,
  environmentType: EnvironmentType
): Promise<EnvironmentAccess> {
  if (role === "OWNER") {
    return "write";
  }

  const override = await prisma.orgEnvironmentPermission.findUnique({
    where: { orgId_role_environmentType: { orgId, role, environmentType } },
  });

  if (override) {
    return toLowerAccess(override.access);
  }

  return getEnvironmentAccess(role, environmentType);
}

/**
 * Environment access is project-scoped: an org role alone grants nothing inside a
 * specific project. Only the OWNER's org-wide role bypasses this (auto-admin everywhere).
 */
export async function getEffectiveAccess(
  orgId: string,
  projectId: string,
  userId: string,
  orgRole: OrgRole,
  environmentType: EnvironmentType
): Promise<EnvironmentAccess> {
  if (orgRole === "OWNER") {
    return "write";
  }

  const grant = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (!grant) {
    return "none";
  }

  return getEffectiveAccessForRole(orgId, grant.role, environmentType);
}

export async function getPermissionMatrix(orgId: string) {
  const overrides = await prisma.orgEnvironmentPermission.findMany({ where: { orgId } });
  const overrideMap = new Map(
    overrides.map((o) => [`${o.role}:${o.environmentType}`, o.access])
  );

  const matrix: Record<string, Record<string, { access: EnvironmentAccessLevel; isOverride: boolean }>> = {};

  for (const role of ALL_ROLES) {
    matrix[role] = {};
    for (const environmentType of ALL_ENV_TYPES) {
      if (role === "OWNER") {
        matrix[role][environmentType] = { access: "WRITE", isOverride: false };
        continue;
      }

      const override = overrideMap.get(`${role}:${environmentType}`);
      if (override) {
        matrix[role][environmentType] = { access: override, isOverride: true };
      } else {
        matrix[role][environmentType] = {
          access: toUpperAccess(getEnvironmentAccess(role, environmentType)),
          isOverride: false,
        };
      }
    }
  }

  return matrix;
}

export async function setPermissionOverride(
  orgId: string,
  input: { role: ProjectRole; environmentType: EnvironmentType; access: EnvironmentAccessLevel | null },
  actorId: string,
  ipAddress?: string
) {
  if (input.role === "OWNER") {
    throw new ForbiddenError("Owner access cannot be overridden");
  }

  const defaultAccess = toUpperAccess(getEnvironmentAccess(input.role, input.environmentType));
  const shouldReset = input.access === null || input.access === defaultAccess;

  await prisma.$transaction(async (tx) => {
    if (shouldReset) {
      await tx.orgEnvironmentPermission.deleteMany({
        where: { orgId, role: input.role, environmentType: input.environmentType },
      });
    } else {
      await tx.orgEnvironmentPermission.upsert({
        where: {
          orgId_role_environmentType: {
            orgId,
            role: input.role,
            environmentType: input.environmentType,
          },
        },
        create: {
          orgId,
          role: input.role,
          environmentType: input.environmentType,
          access: input.access as EnvironmentAccessLevel,
        },
        update: { access: input.access as EnvironmentAccessLevel },
      });
    }

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: shouldReset ? "permission.override_reset" : "permission.override_set",
      targetType: "OrgEnvironmentPermission",
      metadata: { role: input.role, environmentType: input.environmentType, access: input.access },
      ipAddress,
    });
  });

  return getPermissionMatrix(orgId);
}
