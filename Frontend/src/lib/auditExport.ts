import { api, AuditLogEntry } from "./api";
import { buildCsv, downloadCsv } from "./csv";
import { getActionDisplay } from "./auditActions";

export async function exportAuditLogsCsv(orgId: string, orgSlug: string) {
  const logs = (await api.listAuditLogs(orgId, { limit: 200 })) as AuditLogEntry[];

  const headers = ["Timestamp", "Actor", "Action", "Key/Target", "Project", "IP Address"];
  const rows = logs.map((log: AuditLogEntry) => [
    log.createdAt,
    log.actor?.name ?? "Unknown",
    getActionDisplay(log.action).label,
    (log.metadata?.key as string | undefined) ?? log.targetType ?? "",
    log.project?.name ?? "",
    log.ipAddress ?? "",
  ]);

  const csv = buildCsv(headers, rows);
  downloadCsv(`envsync-audit-log-${orgSlug}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
