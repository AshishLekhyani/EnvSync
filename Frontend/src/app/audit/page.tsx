"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, AuditLogEntry } from "@/lib/api";
import { describeAuditLog, getActionDisplay } from "@/lib/auditActions";
import { exportAuditLogsCsv } from "@/lib/auditExport";

function AuditPageContent() {
  const { activeOrg: org } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .listAuditLogs(org.id, { limit: 50, projectId: projectId ?? undefined })
      .then((result) => {
        if (!cancelled) {
          setLogs(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load audit logs");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org, projectId]);

  const onExport = async () => {
    if (!org) return;
    setExporting(true);
    setError(null);
    try {
      await exportAuditLogsCsv(org.id, org.slug);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell searchPlaceholder="Search audit logs...">
      <div className="mx-auto max-w-container-max pb-xl">
        <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Audit Logs</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              Track every secret change, restore, and export across your
              organization.
            </p>
          </div>
          <button
            type="button"
            disabled={!org || exporting}
            onClick={onExport}
            className="flex items-center gap-xs rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60 dark:border-outline-variant dark:bg-surface-container-high"
          >
            <Icon
              name={exporting ? "progress_activity" : "download"}
              className={exporting ? "animate-spin" : ""}
            />
            {exporting ? "Exporting..." : "Export Logs"}
          </button>
        </div>

        {error && (
          <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {!org && (
          <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
            Create an organization on the Projects page first.
          </div>
        )}

        {org && (
          <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
            <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
              <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
                Recent Activity
              </h2>
            </div>

            {loading ? (
              <div className="flex justify-center py-xl text-secondary">
                <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
              </div>
            ) : logs.length === 0 ? (
              <p className="px-md py-xl text-center font-body-md text-body-md text-secondary">
                {projectId ? "No activity for this project yet." : "No activity yet."}
              </p>
            ) : (
              <div className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                {logs.map((log) => {
                  const display = getActionDisplay(log.action);
                  const m = log.metadata;
                  const key =
                    (m?.key as string | undefined) ??
                    (m?.email as string | undefined) ??
                    (m?.name as string | undefined) ??
                    (m?.newName as string | undefined) ??
                    log.targetType ??
                    "—";
                  const detail = describeAuditLog(log);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA] dark:hover:bg-surface-container-low"
                    >
                      <div className="flex items-center gap-md">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low">
                          <Icon name={display.icon} className={display.iconClass} />
                        </div>
                        <div>
                          <p className="font-body-md text-body-md text-on-surface">
                            <span className="font-bold">
                              {log.actor?.name ?? "Unknown"}
                            </span>{" "}
                            <span className="text-secondary">{display.label}</span>{" "}
                            <span className="rounded border border-outline-variant bg-surface-container px-xs py-[2px] font-code-md text-code-md">
                              {key}
                            </span>
                          </p>
                          <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
                            {log.project?.name ?? "—"}
                            {detail ? ` · ${detail}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="font-body-sm text-body-sm text-secondary">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={null}>
      <AuditPageContent />
    </Suspense>
  );
}
