import { EnvironmentType, OrgRole } from "@prisma/client";

export const ROLE_WEIGHT: Record<OrgRole, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasAtLeastRole(actual: OrgRole, required: OrgRole): boolean {
  return ROLE_WEIGHT[actual] >= ROLE_WEIGHT[required];
}

export type EnvironmentAccess = "none" | "read" | "write";

const ENVIRONMENT_ACCESS: Record<OrgRole, Record<EnvironmentType, EnvironmentAccess>> = {
  OWNER: {
    DEVELOPMENT: "write",
    TESTING: "write",
    STAGING: "write",
    PRODUCTION: "write",
  },
  ADMIN: {
    DEVELOPMENT: "write",
    TESTING: "write",
    STAGING: "write",
    PRODUCTION: "write",
  },
  DEVELOPER: {
    DEVELOPMENT: "write",
    TESTING: "write",
    STAGING: "write",
    PRODUCTION: "read",
  },
  VIEWER: {
    DEVELOPMENT: "read",
    TESTING: "read",
    STAGING: "read",
    PRODUCTION: "none",
  },
};

export function getEnvironmentAccess(
  role: OrgRole,
  environmentType: EnvironmentType
): EnvironmentAccess {
  return ENVIRONMENT_ACCESS[role][environmentType];
}

export function canReadEnvironment(
  role: OrgRole,
  environmentType: EnvironmentType
): boolean {
  return getEnvironmentAccess(role, environmentType) !== "none";
}

export function canWriteEnvironment(
  role: OrgRole,
  environmentType: EnvironmentType
): boolean {
  return getEnvironmentAccess(role, environmentType) === "write";
}
