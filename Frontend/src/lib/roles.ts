import { OrgRole } from "./api";

const ROLE_WEIGHT: Record<OrgRole, number> = {
  VIEWER: 1,
  DEVELOPER: 2,
  ADMIN: 3,
  OWNER: 4,
};

const ALL_ROLES: OrgRole[] = ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"];

// Mirrors the backend's assertCanAssignRole — keep in sync.
export function assignableRoles(actorRole: OrgRole): OrgRole[] {
  if (actorRole === "OWNER") {
    return ALL_ROLES.filter((r) => r !== "OWNER");
  }
  return ALL_ROLES.filter((r) => ROLE_WEIGHT[r] < ROLE_WEIGHT[actorRole]);
}

export function rolesAboveMine(role: OrgRole): OrgRole[] {
  return ALL_ROLES.filter((r) => r !== "OWNER" && ROLE_WEIGHT[r] > ROLE_WEIGHT[role]);
}
