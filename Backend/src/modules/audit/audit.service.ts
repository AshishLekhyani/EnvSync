import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export type AuditAction =
  | "org.create"
  | "org.update"
  | "org.delete"
  | "member.add"
  | "member.role_change"
  | "member.remove"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "environment.create"
  | "environment.delete"
  | "secret.create"
  | "secret.update"
  | "secret.delete"
  | "secret.reveal"
  | "secret.version_reveal"
  | "secret.restore"
  | "secret.rotate"
  | "apitoken.create"
  | "apitoken.revoke"
  | "secret.expiry_update"
  | "permission.override_set"
  | "permission.override_reset"
  | "invite.create"
  | "invite.accept"
  | "invite.approve"
  | "invite.reject"
  | "invite.auto_approve_set"
  | "member.project_access_grant"
  | "member.project_access_revoke"
  | "member.view_all_set"
  | "member.leave"
  | "org.ownership_transfer"
  | "project_access.request"
  | "project_access.approve"
  | "project_access.reject";

interface WriteAuditLogInput {
  orgId: string;
  actorId: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export function writeAuditLog(
  client: PrismaClientOrTx,
  input: WriteAuditLogInput
) {
  return client.auditLog.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      projectId: input.projectId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: input.ipAddress,
    },
  });
}

interface ListAuditLogsFilters {
  projectId?: string;
  action?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

function resolveProjectFilter(
  requestedProjectId: string | undefined,
  accessibleProjectIds: "all" | string[]
): string | { in: string[] } | undefined {
  if (accessibleProjectIds === "all") {
    return requestedProjectId;
  }

  if (requestedProjectId) {
    // Sentinel that can never match a real cuid, so an inaccessible project yields no rows.
    return accessibleProjectIds.includes(requestedProjectId) ? requestedProjectId : "__no_access__";
  }

  return { in: accessibleProjectIds };
}

export function listAuditLogs(
  orgId: string,
  filters: ListAuditLogsFilters,
  accessibleProjectIds: "all" | string[]
) {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (filters.startDate) createdAt.gte = new Date(filters.startDate);
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }

  return prisma.auditLog.findMany({
    where: {
      orgId,
      projectId: resolveProjectFilter(filters.projectId, accessibleProjectIds),
      action: filters.action,
      actorId: filters.actorId,
      ...(createdAt.gte || createdAt.lte ? { createdAt } : {}),
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 50,
  });
}
