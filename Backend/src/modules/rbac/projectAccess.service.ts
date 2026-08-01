import { OrgMembership, OrgRole, ProjectRole } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function canViewAllProjects(role: OrgRole, membership: OrgMembership): boolean {
  return role === "OWNER" || membership.canViewAllProjects;
}

// Org role is binary (OWNER or the plain-member placeholder) — every non-owner member
// can browse the full project list and request access; only the Owner already sees
// everything and has no need to browse.
export function canBrowseAllProjects(role: OrgRole): boolean {
  return role !== "OWNER";
}

export async function getAccessibleProjectIds(
  orgId: string,
  userId: string,
  role: OrgRole,
  membership: OrgMembership
): Promise<"all" | string[]> {
  if (canViewAllProjects(role, membership)) {
    return "all";
  }

  const grants = await prisma.projectMembership.findMany({
    where: { userId, project: { orgId } },
    select: { projectId: true },
  });

  return grants.map((g) => g.projectId);
}

export async function getProjectRole(
  userId: string,
  projectId: string,
  orgRole: OrgRole
): Promise<ProjectRole | null> {
  if (orgRole === "OWNER") return "OWNER";

  const grant = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  return grant?.role ?? null;
}

export async function hasProjectAccess(
  orgId: string,
  userId: string,
  projectId: string,
  role: OrgRole,
  membership: OrgMembership
): Promise<boolean> {
  if (canViewAllProjects(role, membership)) {
    return true;
  }

  const grant = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  return !!grant;
}
