"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { api, ApiError, AuditLogEntry, PaginatedAuditLogs } from "@/lib/api";
import { ACTION_DISPLAY, describeAuditLog, getActionDisplay } from "@/lib/auditActions";
import { exportAuditLogsCsv } from "@/lib/auditExport";

const ACTION_OPTIONS = Object.keys(ACTION_DISPLAY).sort();

function AuditPageContent() {
  const { activeOrg: org } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const action = searchParams.get("action");
  const actorId = searchParams.get("actorId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    router.push(`/audit${next.toString() ? `?${next}` : ""}`);
  };

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(nextPage));
    router.push(`/audit?${next}`);
  };

  const membersQuery = useQuery({
    queryKey: queryKeys.orgMembers(org?.id ?? ""),
    queryFn: () => api.listMembers(org!.id),
    enabled: !!org,
  });
  const members = membersQuery.data ?? [];

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .listAuditLogs(org.id, {
        page,
        projectId: projectId ?? undefined,
        action: action ?? undefined,
        actorId: actorId ?? undefined,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      })
      .then((result) => {
        if (!cancelled) {
          const paginated = result as PaginatedAuditLogs;
          setLogs(paginated.items);
          setTotal(paginated.total);
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
  }, [org, projectId, action, actorId, startDate, endDate, page]);

  const filteredLogs = search.trim()
    ? logs.filter((log) => {
        const q = search.trim().toLowerCase();
        const display = getActionDisplay(log.action);
        const m = log.metadata;
        const haystack = [
          display.label,
          log.action,
          log.actor?.name,
          log.actor?.email,
          log.project?.name,
          m?.key as string | undefined,
          m?.email as string | undefined,
          m?.name as string | undefined,
          m?.newName as string | undefined,
        ]
          .filter((v): v is string => typeof v === "string")
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
    : logs;

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
    <AppShell searchPlaceholder="Search audit logs..." onSearch={setSearch}>
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

        {org && (
          <div className="mb-lg flex flex-col gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md sm:flex-row sm:flex-wrap sm:items-end">
            <Select
              label="Action"
              wrapperClassName="flex-1 min-w-[160px]"
              value={action ?? ""}
              onChange={(e) => setFilter("action", e.target.value)}
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {getActionDisplay(a).label}
                </option>
              ))}
            </Select>
            <Select
              label="Actor"
              wrapperClassName="flex-1 min-w-[160px]"
              value={actorId ?? ""}
              onChange={(e) => setFilter("actorId", e.target.value)}
            >
              <option value="">Everyone</option>
              {members.map((m) => (
                <option key={m.membershipId} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </Select>
            <label className="flex-1 min-w-[140px]">
              <span className="mb-xs block font-label-md text-label-md text-on-surface">
                From
              </span>
              <input
                type="date"
                value={startDate ?? ""}
                onChange={(e) => setFilter("startDate", e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <label className="flex-1 min-w-[140px]">
              <span className="mb-xs block font-label-md text-label-md text-on-surface">To</span>
              <input
                type="date"
                value={endDate ?? ""}
                onChange={(e) => setFilter("endDate", e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
              />
            </label>
            {(action || actorId || startDate || endDate) && (
              <button
                type="button"
                onClick={() => router.push(projectId ? `/audit?projectId=${projectId}` : "/audit")}
                className="font-body-sm text-body-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

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
            ) : filteredLogs.length === 0 ? (
              <p className="px-md py-xl text-center font-body-md text-body-md text-secondary">
                No activity matches &ldquo;{search}&rdquo;.
              </p>
            ) : (
              <div className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                {filteredLogs.map((log) => {
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

            {!loading && total > 0 && (
              <div className="flex items-center justify-between border-t border-[#D0D7DE] dark:border-outline-variant px-md py-sm">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Page {page} of {Math.max(1, Math.ceil(total / 40))} ({total} entries)
                </span>
                <div className="flex gap-sm">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="rounded-lg border border-outline-variant px-md py-1 font-label-md text-label-md text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= Math.ceil(total / 40)}
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg border border-outline-variant px-md py-1 font-label-md text-label-md text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
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
