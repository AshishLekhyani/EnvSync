"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { assignableRoles } from "@/lib/roles";
import { api, ApiError, MemberSummary, OrgRole } from "@/lib/api";
import { roleBadgeClass } from "@/lib/roleBadge";

function ProjectAccessRow({
  orgId,
  member,
  onUpdate,
  onRemoved,
}: {
  orgId: string;
  member: MemberSummary;
  onUpdate: (membershipId: string, patch: Partial<MemberSummary>) => void;
  onRemoved: (membershipId: string) => void;
}) {
  const { activeOrg: org, user } = useAuth();
  const isOwner = org?.role === "OWNER";

  const projectsQuery = useQuery({
    queryKey: queryKeys.orgProjects(orgId),
    queryFn: () => api.listProjects(orgId),
  });
  const projects = projectsQuery.data ?? [];

  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [pendingViewAll, setPendingViewAll] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = org ? assignableRoles(org.role) : [];
  const canChangeRole = member.role !== "OWNER" && roleOptions.length > 0;
  const canRemove = member.role === "OWNER" ? member.user.id === user?.id : true;

  const onChangeRole = async (nextRole: OrgRole) => {
    if (nextRole === member.role) return;
    if (
      !window.confirm(`Change ${member.user.name}'s role from ${member.role} to ${nextRole}?`)
    ) {
      return;
    }
    setChangingRole(true);
    setError(null);
    try {
      await api.updateMemberRole(orgId, member.membershipId, nextRole);
      onUpdate(member.membershipId, { role: nextRole });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to change role");
    } finally {
      setChangingRole(false);
    }
  };

  const onRemove = async () => {
    const isSelf = member.user.id === user?.id;
    if (
      !window.confirm(
        isSelf
          ? "Leave this organization? You'll lose access immediately."
          : `Remove ${member.user.name} from this organization?`
      )
    ) {
      return;
    }
    setRemoving(true);
    setError(null);
    try {
      await api.removeMember(orgId, member.membershipId);
      onRemoved(member.membershipId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove member");
      setRemoving(false);
    }
  };

  const grantedIds = new Set((member.projectAccess ?? []).map((p) => p.id));

  const toggleProject = async (projectId: string, projectName: string) => {
    setPendingProjectId(projectId);
    setError(null);
    try {
      if (grantedIds.has(projectId)) {
        await api.revokeProjectAccess(orgId, member.membershipId, projectId);
        onUpdate(member.membershipId, {
          projectAccess: (member.projectAccess ?? []).filter((p) => p.id !== projectId),
        });
      } else {
        await api.grantProjectAccess(orgId, member.membershipId, projectId);
        onUpdate(member.membershipId, {
          projectAccess: [...(member.projectAccess ?? []), { id: projectId, name: projectName }],
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update project access");
    } finally {
      setPendingProjectId(null);
    }
  };

  const toggleViewAll = async () => {
    setPendingViewAll(true);
    setError(null);
    try {
      const next = !member.canViewAllProjects;
      await api.setCanViewAllProjects(orgId, member.membershipId, next);
      onUpdate(member.membershipId, { canViewAllProjects: next });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update view-all access");
    } finally {
      setPendingViewAll(false);
    }
  };

  return (
    <div className="border-t border-[#D0D7DE] bg-surface-container-low px-md py-md dark:border-outline-variant">
      {error && (
        <p className="mb-sm font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">{error}</p>
      )}

      {(canChangeRole || canRemove) && (
        <div className="mb-md flex flex-wrap items-center gap-md">
          {canChangeRole && (
            <Select
              label="Role"
              wrapperClassName="w-40"
              value={member.role}
              disabled={changingRole}
              onChange={(e) => onChangeRole(e.target.value as OrgRole)}
            >
              <option value={member.role}>
                {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
              </option>
              {roleOptions
                .filter((r) => r !== member.role)
                .map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
            </Select>
          )}
          {canRemove && (
            <button
              type="button"
              disabled={removing}
              onClick={onRemove}
              className="font-label-md text-label-md text-xs text-error hover:underline disabled:opacity-50"
            >
              {removing
                ? "Removing..."
                : member.user.id === user?.id
                  ? "Leave organization"
                  : "Remove from organization"}
            </button>
          )}
        </div>
      )}

      {isOwner && member.role !== "OWNER" && (
        <label className="mb-md flex items-center gap-sm">
          <input
            type="checkbox"
            checked={!!member.canViewAllProjects}
            disabled={pendingViewAll}
            onChange={toggleViewAll}
            className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
          />
          <span className="font-label-md text-label-md text-on-surface">
            Can view all projects
          </span>
        </label>
      )}

      {member.canViewAllProjects ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          This member can already see every project in the organization.
        </p>
      ) : member.role === "OWNER" ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Owners always have access to every project.
        </p>
      ) : projects.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">No projects yet.</p>
      ) : (
        <div className="flex flex-col gap-xs">
          <p className="font-body-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
            Project access
          </p>
          {projects.map((p) => (
            <label key={p.id} className="flex items-center gap-sm">
              <input
                type="checkbox"
                checked={grantedIds.has(p.id)}
                disabled={pendingProjectId === p.id}
                onChange={() => toggleProject(p.id, p.name)}
                className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
              />
              <span className="font-body-sm text-body-sm text-on-surface">{p.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function MembersSection({ search }: { search: string }) {
  const { activeOrg: org } = useAuth();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const canManageAccess = org.role === "OWNER" || org.role === "ADMIN";

  const onMemberUpdate = (membershipId: string, patch: Partial<MemberSummary>) => {
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === membershipId ? { ...m, ...patch } : m))
    );
  };

  const onMemberRemoved = (membershipId: string) => {
    setMembers((prev) => prev.filter((m) => m.membershipId !== membershipId));
    setExpandedId((prev) => (prev === membershipId ? null : prev));
  };

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
            {filteredMembers.map((m) => {
              const expandable = canManageAccess && m.canViewAllProjects !== undefined;
              const expanded = expandable && expandedId === m.membershipId;
              return (
                <div key={m.membershipId}>
                  <div
                    className={`flex items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA] dark:hover:bg-surface-container-low ${
                      expandable ? "cursor-pointer" : ""
                    }`}
                    onClick={() =>
                      expandable &&
                      setExpandedId((prev) => (prev === m.membershipId ? null : m.membershipId))
                    }
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
                          {m.canViewAllProjects && m.role !== "OWNER" && (
                            <span className="rounded-full border border-primary/20 bg-primary/10 px-sm py-[1px] text-[10px] font-bold uppercase text-primary">
                              All Projects
                            </span>
                          )}
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          {m.user.email}
                        </div>
                      </div>
                    </div>
                    {expandable && (
                      <Icon
                        name={expanded ? "expand_less" : "expand_more"}
                        className="text-secondary"
                      />
                    )}
                  </div>
                  {expanded && (
                    <ProjectAccessRow
                      orgId={org.id}
                      member={m}
                      onUpdate={onMemberUpdate}
                      onRemoved={onMemberRemoved}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-start gap-md rounded-xl border border-primary/20 bg-primary/5 p-md">
        <Icon name="info" className="text-primary" filled />
        <div>
          <h4 className="font-body-md text-body-md font-bold text-on-surface">
            Project-Level Access
          </h4>
          <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
            Members only see the projects they&apos;ve been explicitly granted access to,
            unless they have the &quot;view all projects&quot; override. Owners always see
            everything.
          </p>
        </div>
      </div>
    </div>
  );
}
