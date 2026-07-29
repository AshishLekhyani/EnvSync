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

export async function deleteOrganization(orgId: string) {
  await prisma.organization.delete({ where: { id: orgId } });
}
