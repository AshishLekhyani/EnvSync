"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, MemberSummary } from "@/lib/api";
import { roleBadgeClass } from "@/lib/roleBadge";

export function MembersSection({ search }: { search: string }) {
  const { activeOrg: org } = useAuth();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .listMembers(org.id)
      .then((list) => {
        if (!cancelled) {
          setMembers(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load team members");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  if (!org) {
    return (
      <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
        Create an organization on the Projects page first.
      </div>
    );
  }

  const filteredMembers = search.trim()
    ? members.filter((m) => {
        const q = search.trim().toLowerCase();
        return (
          m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
        );
      })
    : members;

  return (
    <div className="flex flex-col gap-md">
      {error && (
        <div className="rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
          <h3 className="font-label-md text-label-md font-bold text-on-surface">
            Team Members
            <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
              {members.length} Total
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-xl text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
          </div>
        ) : (
          <div className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
            {filteredMembers.length === 0 && (
              <p className="px-md py-lg text-center font-body-sm text-body-sm text-secondary">
                No members match your search.
              </p>
            )}
            {filteredMembers.map((m) => (
              <div
                key={m.membershipId}
                className="flex items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA] dark:hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-md">
                  <Avatar name={m.user.name} seed={m.user.email} className="h-10 w-10" />
                  <div>
                    <div className="flex items-center gap-sm">
                      <span className="font-body-md text-body-md font-bold text-on-surface">
                        {m.user.name}
                      </span>
                      <span
                        className={`rounded-full px-sm py-[1px] text-[10px] font-bold uppercase ${roleBadgeClass(m.role)}`}
                      >
                        {m.role}
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      {m.user.email}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-md rounded-xl border border-primary/20 bg-primary/5 p-md">
        <Icon name="info" className="text-primary" filled />
        <div>
          <h4 className="font-body-md text-body-md font-bold text-on-surface">
            Role Propagation
          </h4>
          <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
            Roles assigned at the project level will automatically propagate to all
            microservices and sub-environments unless overridden in the Permission Matrix.
          </p>
        </div>
      </div>
    </div>
  );
}
