import { OrgMembership, OrgRole } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function canViewAllProjects(role: OrgRole, membership: OrgMembership): boolean {
  return role === "OWNER" || membership.canViewAllProjects;
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
