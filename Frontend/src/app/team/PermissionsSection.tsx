"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  ApiError,
  EnvironmentAccessLevel,
  EnvironmentType,
  OrgRole,
  PermissionMatrix,
} from "@/lib/api";

const ENV_COLUMNS: { type: EnvironmentType; label: string }[] = [
  { type: "DEVELOPMENT", label: "Dev" },
  { type: "TESTING", label: "Testing" },
  { type: "STAGING", label: "Staging" },
  { type: "PRODUCTION", label: "Prod" },
];

const ROLE_ROWS: OrgRole[] = ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"];

export function PermissionsSection() {
  const { activeOrg: org } = useAuth();
  const isAdmin = org?.role === "OWNER" || org?.role === "ADMIN";

  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) {
      setPermissionsLoading(false);
      return;
    }

    let cancelled = false;
    setPermissionsLoading(true);

    api
      .getPermissionMatrix(org.id)
      .then((matrix) => {
        if (!cancelled) {
          setPermissionMatrix(matrix);
          setPermissionError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPermissionError(
            err instanceof ApiError ? err.message : "Failed to load permission matrix"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPermissionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  const onChangePermission = async (
    role: OrgRole,
    environmentType: EnvironmentType,
    access: EnvironmentAccessLevel | null
  ) => {
    if (!org) return;
    setPermissionError(null);
    try {
      const matrix = await api.setPermissionOverride(org.id, { role, environmentType, access });
      setPermissionMatrix(matrix);
    } catch (err) {
      setPermissionError(err instanceof ApiError ? err.message : "Failed to update permission");
    }
  };

  if (!org) {
    return (
      <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
        Create an organization on the Projects page first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
        <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
          <h3 className="font-label-md text-label-md font-bold text-on-surface">
            Permission Matrix
          </h3>
        </div>
        {permissionError && (
          <div className="mx-md mt-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {permissionError}
          </div>
        )}
        <div className="custom-scrollbar overflow-x-auto">
          {permissionsLoading || !permissionMatrix ? (
            <div className="flex justify-center py-xl text-secondary">
              <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {["Role", ...ENV_COLUMNS.map((c) => c.label)].map((h) => (
                    <th
                      key={h}
                      className="border-b border-[#D0D7DE] dark:border-outline-variant px-md py-sm text-[10px] font-bold uppercase text-on-surface-variant"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                {ROLE_ROWS.map((role) => (
                  <tr key={role}>
                    <td className="px-md py-md font-body-sm text-body-sm font-bold capitalize text-on-surface">
                      {role.charAt(0) + role.slice(1).toLowerCase()}
                    </td>
                    {ENV_COLUMNS.map((col) => {
                      if (role === "OWNER") {
                        return (
                          <td key={col.type} className="matrix-cell px-md py-md text-center">
                            <Icon name="verified_user" className="text-primary" filled />
                          </td>
                        );
                      }

                      const cell = permissionMatrix[role][col.type];

                      if (!isAdmin) {
                        return (
                          <td key={col.type} className="matrix-cell px-md py-md text-center">
                            {cell.access === "WRITE" && (
                              <Icon name="check_circle" className="text-primary" filled />
                            )}
                            {cell.access === "READ" && (
                              <Icon name="visibility" className="text-on-surface-variant" />
                            )}
                            {cell.access === "NONE" && (
                              <Icon name="block" className="text-error" />
                            )}
                          </td>
                        );
                      }

                      return (
                        <td key={col.type} className="matrix-cell px-md py-md text-center">
                          <div className="flex items-center justify-center gap-xs">
                            <select
                              value={cell.access}
                              onChange={(e) =>
                                onChangePermission(
                                  role,
                                  col.type,
                                  e.target.value as EnvironmentAccessLevel
                                )
                              }
                              className="rounded border border-outline-variant bg-surface-container-low px-xs py-[2px] font-body-sm text-[11px] text-on-surface outline-none focus:border-primary"
                            >
                              <option value="NONE">None</option>
                              <option value="READ">Read</option>
                              <option value="WRITE">Write</option>
                            </select>
                            {cell.isOverride && (
                              <button
                                type="button"
                                onClick={() => onChangePermission(role, col.type, null)}
                                className="text-secondary hover:text-primary"
                                aria-label="Reset to default"
                                title="Reset to default"
                              >
                                <Icon name="restart_alt" style={{ fontSize: 14 }} />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low p-md">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-sm">
              <Icon name="check_circle" className="text-primary" filled style={{ fontSize: 16 }} />
              <span className="font-body-sm text-[11px] text-on-surface-variant">
                Full Read/Write Access
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <Icon
                name="visibility"
                className="text-on-surface-variant"
                style={{ fontSize: 16 }}
              />
              <span className="font-body-sm text-[11px] text-on-surface-variant">
                Read-only Access
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <Icon name="block" className="text-error" style={{ fontSize: 16 }} />
              <span className="font-body-sm text-[11px] text-on-surface-variant">
                No Access (Hidden)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#CF222E]/30 bg-[#FFEBE9] p-md dark:border-red-500/30 dark:bg-red-500/10">
        <h4 className="flex items-center gap-sm font-body-md text-body-md font-bold text-[#CF222E] dark:text-red-400">
          <Icon name="gpp_maybe" />
          Sensitive Operations
        </h4>
        <p className="mt-xs font-body-sm text-body-sm text-[#CF222E]/80 dark:text-red-400/80">
          Changing &apos;Owner&apos; status requires Multi-Factor Authentication and a
          24-hour verification window.
        </p>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-md cursor-not-allowed rounded-lg border border-[#CF222E] bg-transparent px-md py-sm font-body-sm text-body-sm font-bold text-[#CF222E] opacity-60 dark:border-red-500/50 dark:text-red-400"
        >
          Request Role Ownership Change
        </button>
      </div>
    </div>
  );
}
