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

// Roles a member could request as an upgrade from their current project role —
// mirrors the backend's createAccessRequest weight check (requested > current).
export function rolesAboveCurrent(currentRole: ProjectRole | null | undefined): ProjectRole[] {
  const currentWeight = currentRole ? ROLE_WEIGHT[currentRole] : 0;
  return ALL_ROLES.filter((r) => r !== "OWNER" && ROLE_WEIGHT[r] > currentWeight);
}

