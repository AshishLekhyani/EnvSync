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
  | "invite.accept";

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
  limit?: number;
}

export function listAuditLogs(orgId: string, filters: ListAuditLogsFilters) {
  return prisma.auditLog.findMany({
    where: {
      orgId,
      projectId: filters.projectId,
      action: filters.action,
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 50,
  });
}
