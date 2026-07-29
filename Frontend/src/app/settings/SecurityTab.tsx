"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, SessionSummary } from "@/lib/api";

export function SecurityTab() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setSessionsLoading(false);
      return;
    }

    let cancelled = false;
    setSessionsLoading(true);

    api
      .listSessions()
      .then((result) => {
        if (!cancelled) {
          setSessions(result);
          setSessionError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSessionError(err instanceof ApiError ? err.message : "Failed to load sessions");
        }
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const onRevokeSession = async (sessionId: string) => {
    if (!window.confirm("Revoke this session? That device will be signed out immediately.")) {
      return;
    }
    setRevokingSessionId(sessionId);
    setSessionError(null);

    try {
      await api.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setSessionError(err instanceof ApiError ? err.message : "Failed to revoke session");
    } finally {
      setRevokingSessionId(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
        <Icon name="devices" className="text-primary" />
        <h2 className="font-h3 text-h3 text-on-surface">Active Sessions</h2>
      </div>
      <div className="flex flex-col gap-md p-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          These are the devices and browsers currently signed in to your
          account. Revoke any session you don&apos;t recognize.
        </p>

        {sessionError && (
          <div className="rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {sessionError}
          </div>
        )}

        <div className="flex max-h-96 flex-col gap-xs overflow-y-auto">
          {sessionsLoading ? (
            <div className="flex justify-center py-md text-secondary">
              <Icon
                name="progress_activity"
                className="animate-spin"
                style={{ fontSize: 20 }}
              />
            </div>
          ) : sessions.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              No active sessions.
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-xs">
                    <span className="truncate font-label-md text-label-md text-on-surface">
                      {s.userAgent ?? "Unknown device"}
                    </span>
                    {s.current && (
                      <span className="rounded-full bg-primary/10 px-sm py-[1px] text-[10px] font-bold uppercase text-primary">
                        This device
                      </span>
                    )}
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    {s.ipAddress ?? "Unknown IP"} · Signed in{" "}
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={revokingSessionId === s.id}
                  onClick={() => onRevokeSession(s.id)}
                  className="flex-shrink-0 font-label-md text-label-md text-xs text-error hover:underline disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
