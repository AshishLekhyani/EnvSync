import { EnvironmentType, ProjectRole } from "@prisma/client";

// Weight/access tables use ProjectRole (the 4-tier hierarchy). OrgRole's members
// (OWNER, VIEWER) are a strict subset of ProjectRole's, so org-level role values
// pass through these functions unchanged wherever they're compared or weighed.
export const ROLE_WEIGHT: Record<ProjectRole, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasAtLeastRole(actual: ProjectRole, required: ProjectRole): boolean {
  return ROLE_WEIGHT[actual] >= ROLE_WEIGHT[required];
}

export type EnvironmentAccess = "none" | "read" | "write";

const ENVIRONMENT_ACCESS: Record<ProjectRole, Record<EnvironmentType, EnvironmentAccess>> = {
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
  role: ProjectRole,
  environmentType: EnvironmentType
): EnvironmentAccess {
  return ENVIRONMENT_ACCESS[role][environmentType];
}

export function canReadEnvironment(
  role: ProjectRole,
  environmentType: EnvironmentType
): boolean {
  return getEnvironmentAccess(role, environmentType) !== "none";
}

export function canWriteEnvironment(
  role: ProjectRole,
  environmentType: EnvironmentType
): boolean {
  return getEnvironmentAccess(role, environmentType) === "write";
}
