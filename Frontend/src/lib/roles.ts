import { ProjectRole } from "./api";

const ROLE_WEIGHT: Record<ProjectRole, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  ADMIN: 3,
  OWNER: 4,
};

const ALL_ROLES: ProjectRole[] = ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"];

// Mirrors the backend's assertCanAssignRole — keep in sync.
export function assignableRoles(actorRole: ProjectRole): ProjectRole[] {
  if (actorRole === "OWNER") {
    return ALL_ROLES.filter((r) => r !== "OWNER");
  }
  return ALL_ROLES.filter((r) => ROLE_WEIGHT[r] < ROLE_WEIGHT[actorRole]);
}

