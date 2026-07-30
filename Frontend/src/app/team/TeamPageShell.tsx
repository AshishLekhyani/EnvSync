"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { exportAuditLogsCsv } from "@/lib/auditExport";

export function TeamPageShell({
  onSearch,
  children,
}: {
  onSearch?: (query: string) => void;
  children: React.ReactNode;
}) {
  const { activeOrg: org } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <AppShell searchPlaceholder="Search team..." onSearch={onSearch} showSearch={!!onSearch}>
      <div className="mx-auto max-w-container-max pb-xl">
        <div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Access Control</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              Manage team members and their environment permissions.
            </p>
          </div>
          {org && (
            <button
              type="button"
              disabled={exporting}
              onClick={onExport}
              className="flex items-center gap-xs self-start rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-[#24292F] shadow-sm transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60 dark:border-outline-variant dark:bg-surface-container-high dark:text-on-surface"
            >
              <Icon
                name={exporting ? "progress_activity" : "download"}
                className={exporting ? "animate-spin" : ""}
              />
              {exporting ? "Exporting..." : "Export Audit Log"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {children}
      </div>
    </AppShell>
  );
}
