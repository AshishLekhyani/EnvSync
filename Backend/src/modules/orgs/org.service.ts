import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../common/errors/AppError";
import { getOrCreateOrgDek } from "../encryption/orgKey.service";
import { writeAuditLog } from "../audit/audit.service";
import { CreateOrgInput, UpdateOrgInput } from "./org.validators";

export async function createOrganization(
  input: CreateOrgInput,
  actorId: string,
  ipAddress?: string
) {
  const existingSlug = await prisma.organization.findUnique({
    where: { slug: input.slug },
  });

  if (existingSlug) {
    throw new ConflictError("An organization with this slug already exists");
  }

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: { name: input.name, slug: input.slug },
    });

    await tx.orgMembership.create({
      data: { userId: actorId, orgId: created.id, role: "OWNER" },
    });

    await writeAuditLog(tx, {
      orgId: created.id,
      actorId,
      action: "org.create",
      targetType: "Organization",
      targetId: created.id,
      ipAddress,
    });

    return created;
  });

  await getOrCreateOrgDek(org.id);

  return org;
}

export async function listOrganizationsForUser(userId: string) {
  const memberships = await prisma.orgMembership.findMany({
    where: { userId },
    include: { org: true },
  });

  return memberships.map((m) => ({
    id: m.org.id,
    name: m.org.name,
    slug: m.org.slug,
    role: m.role,
  }));
}

export async function getOrganization(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });

  if (!org) {
    throw new NotFoundError("Organization not found");
  }

  return org;
}

export async function updateOrganization(
  orgId: string,
  input: UpdateOrgInput,
  actorId: string,
  ipAddress?: string
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.organization.update({
      where: { id: orgId },
      data: { name: input.name },
    });

    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "org.update",
      targetType: "Organization",
      targetId: orgId,
      ipAddress,
    });

    return updated;
  });
}

export async function exportOrganizationData(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new NotFoundError("Organization not found");
  }

  const [memberships, projects, projectMemberships] = await Promise.all([
    prisma.orgMembership.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.project.findMany({
      where: { orgId },
      include: {
        environments: {
          include: { _count: { select: { secrets: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.projectMembership.findMany({
      where: { project: { orgId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const accessByProject = new Map<string, { id: string; name: string; email: string }[]>();
  for (const pm of projectMemberships) {
    const list = accessByProject.get(pm.projectId) ?? [];
    list.push(pm.user);
    accessByProject.set(pm.projectId, list);
  }

  return {
    exportedAt: new Date().toISOString(),
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
    },
    members: memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      canViewAllProjects: m.canViewAllProjects,
      user: m.user,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      createdAt: p.createdAt,
      environments: p.environments.map((e) => ({
        id: e.id,
        type: e.type,
        name: e.name,
        secretCount: e._count.secrets,
        createdAt: e.createdAt,
      })),
      membersWithAccess: accessByProject.get(p.id) ?? [],
    })),
  };
}

export async function deleteOrganization(
  orgId: string,
  actorId: string,
  ipAddress?: string
) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });

  if (!org) {
    throw new NotFoundError("Organization not found");
  }

  await prisma.$transaction(async (tx) => {
    await writeAuditLog(tx, {
      orgId,
      actorId,
      action: "org.delete",
      targetType: "Organization",
      targetId: orgId,
      metadata: { name: org.name, slug: org.slug },
      ipAddress,
    });

    await tx.organization.delete({ where: { id: orgId } });
  });
}
