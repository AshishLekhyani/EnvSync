"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm-context";
import { queryKeys } from "@/lib/query-keys";
import {
  api,
  ApiError,
  EnvironmentSummary,
  EnvironmentType,
  ProjectMemberSummary,
  ProjectRole,
} from "@/lib/api";
import { roleBadgeClass } from "@/lib/roleBadge";
import { assignableRoles, rolesAboveCurrent } from "@/lib/roles";

const ENV_ICON: Record<EnvironmentType, string> = {
  DEVELOPMENT: "code",
  TESTING: "science",
  STAGING: "swipe_left",
  PRODUCTION: "rocket_launch",
};

const ENV_LABEL: Record<EnvironmentType, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  STAGING: "Staging",
  PRODUCTION: "Production",
};

const ALL_ENV_TYPES: EnvironmentType[] = [
  "DEVELOPMENT",
  "TESTING",
  "STAGING",
  "PRODUCTION",
];

function ProjectMembers({
  projectId,
  orgId,
  canManage,
  myRole,
}: {
  projectId: string;
  orgId: string;
  canManage: boolean;
  myRole: ProjectRole | null | undefined;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("VIEWER");
  const [granting, setGranting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const confirm = useConfirm();

  const projectMembersQuery = useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: () => api.listProjectMembers(projectId),
  });
  const orgMembersQuery = useQuery({
    queryKey: queryKeys.orgMembers(orgId),
    queryFn: () => api.listMembers(orgId),
    enabled: canManage,
  });

  const projectMembers = projectMembersQuery.data ?? [];
  const orgMembers = orgMembersQuery.data ?? [];
  const projectMemberIds = new Set(projectMembers.map((m: ProjectMemberSummary) => m.user.id));
  const addableMembers = orgMembers.filter(
    (m) => m.role !== "OWNER" && !projectMemberIds.has(m.user.id)
  );

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });

  const onGrant = async () => {
    if (!selectedUserId) return;
    const membership = orgMembers.find((m) => m.user.id === selectedUserId);
    if (!membership) return;
    setGranting(true);
    setError(null);
    try {
      await api.grantProjectAccess(orgId, membership.membershipId, projectId, selectedRole);
      await refresh();
      setSelectedUserId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to grant access");
    } finally {
      setGranting(false);
    }
  };

  const onRevoke = async (userId: string) => {
    const membership = orgMembers.find((m) => m.user.id === userId);
    if (!membership) return;
    if (!(await confirm("Remove this person's access to this project?"))) return;
    setBusyUserId(userId);
    setError(null);
    try {
      await api.revokeProjectAccess(orgId, membership.membershipId, projectId);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to revoke access");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="github-card mt-xl overflow-hidden rounded-lg">
      <div className="border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">
          Project Members
          <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
            {projectMembers.length}
          </span>
        </h3>
      </div>
      <div className="flex flex-col divide-y divide-outline-variant">
        {error && (
          <p className="p-md font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
            {error}
          </p>
        )}
        {projectMembersQuery.isPending ? (
          <div className="flex justify-center py-lg text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 20 }} />
          </div>
        ) : (
          projectMembers.map((m: ProjectMemberSummary) => (
            <div
              key={m.user.id}
              className="flex items-center justify-between gap-md px-md py-sm"
            >
              <div>
                <p className="font-body-sm text-body-sm text-on-surface">{m.user.name}</p>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  {m.user.email}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-sm">
                <span
                  className={`rounded-full px-sm py-[1px] text-[10px] font-bold uppercase ${roleBadgeClass(m.role)}`}
                >
                  {m.role}
                </span>
                {canManage && m.role !== "OWNER" && (
                  <button
                    type="button"
                    disabled={busyUserId === m.user.id}
                    onClick={() => onRevoke(m.user.id)}
                    className="rounded-lg border border-outline-variant px-sm py-1 font-label-md text-[11px] text-on-surface disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {canManage && addableMembers.length > 0 && (
        <div className="flex flex-col gap-sm border-t border-outline-variant p-md sm:flex-row sm:items-end">
          <Select
            label="Add member"
            wrapperClassName="flex-1"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Choose a member</option>
            {addableMembers.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name} ({m.user.email})
              </option>
            ))}
          </Select>
          <Select
            label="Role"
            wrapperClassName="sm:w-40"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
          >
            {assignableRoles(myRole === "OWNER" ? "OWNER" : "ADMIN").map((r) => (
              <option key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <button
            type="button"
            disabled={!selectedUserId || granting}
            onClick={onGrant}
            className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
          >
            {granting ? "Adding..." : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, activeOrg: org } = useAuth();
  const confirm = useConfirm();
  const [leaving, setLeaving] = useState(false);

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => api.getProject(projectId),
    enabled: !!user,
  });
  const environmentsQuery = useQuery({
    queryKey: queryKeys.projectEnvironments(projectId),
    queryFn: () => api.listEnvironments(projectId),
    enabled: !!user,
  });

  const project = projectQuery.data ?? null;
  const environments = environmentsQuery.data ?? [];
  const loading = projectQuery.isPending || environmentsQuery.isPending;
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const canManageProject = project?.myRole === "OWNER" || project?.myRole === "ADMIN";

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const [upgradeRole, setUpgradeRole] = useState<ProjectRole>("VIEWER");
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [upgradeRequested, setUpgradeRequested] = useState(false);

  const onStartRename = () => {
    if (!project) return;
    setNameInput(project.name);
    setEditingName(true);
  };

  const onSaveName = async () => {
    if (!project || !nameInput.trim()) return;
    setSavingName(true);
    setError(null);
    try {
      const updated = await api.updateProject(project.id, {
        name: nameInput.trim(),
        description: project.description ?? undefined,
      });
      queryClient.setQueryData(queryKeys.project(project.id), {
        ...updated,
        myRole: project.myRole,
      });
      setEditingName(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rename project");
    } finally {
      setSavingName(false);
    }
  };
  const filteredEnvironments = search.trim()
    ? environments.filter((env) => {
        const q = search.trim().toLowerCase();
        return env.name.toLowerCase().includes(q) || env.type.toLowerCase().includes(q);
      })
    : environments;

  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvType, setNewEnvType] = useState<EnvironmentType | "">("");
  const [creatingEnv, setCreatingEnv] = useState(false);

  const availableTypes = ALL_ENV_TYPES.filter(
    (t) => !environments.some((env) => env.type === t)
  );

  const onCreateEnv = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEnvType) return;
    setCreatingEnv(true);
    setError(null);

    try {
      const env = await api.createEnvironment(projectId, { type: newEnvType });
      queryClient.setQueryData<EnvironmentSummary[]>(
        queryKeys.projectEnvironments(projectId),
        (prev) => [...(prev ?? []), env]
      );
      setShowNewEnv(false);
      setNewEnvType("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create environment");
    } finally {
      setCreatingEnv(false);
    }
  };

  const onLeaveProject = async () => {
    if (!org || !(await confirm("Leave this project? You'll lose access to it immediately."))) {
      return;
    }
    setLeaving(true);
    try {
      await api.leaveProject(org.id, projectId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.orgProjects(org.id) });
      router.push("/projects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to leave project");
      setLeaving(false);
    }
  };

  const upgradeOptions = rolesAboveCurrent(project?.myRole);

  const onStartRequestUpgrade = () => {
    setUpgradeRole(upgradeOptions[0] ?? "VIEWER");
    setRequestingUpgrade(true);
  };

  const onRequestUpgrade = async () => {
    if (!org) return;
    setUpgradeSubmitting(true);
    setError(null);
    try {
      await api.requestProjectAccess(org.id, projectId, upgradeRole);
      setUpgradeRequested(true);
      setRequestingUpgrade(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send request");
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  return (
    <AppShell searchPlaceholder="Search environments..." onSearch={setSearch}>
      <div className="mx-auto max-w-container-max pb-xl">
        <nav className="mb-xs flex items-center gap-xs font-body-sm text-body-sm text-secondary">
          <Link href="/projects" className="hover:underline">
            Projects
          </Link>
          <Icon name="chevron_right" style={{ fontSize: 14 }} />
          <span className="font-medium text-on-surface">
            {project ? project.name : "..."}
          </span>
        </nav>

        {loading ? (
          <div className="flex justify-center py-xl text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 28 }} />
          </div>
        ) : !project ? (
          <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
            This project isn&apos;t available anymore — it may have been deleted, or your
            access to it may have changed.
          </div>
        ) : (
          <>
            <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-center">
              <div>
                {editingName ? (
                  <div className="flex items-center gap-sm">
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={100}
                      className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-xs font-h1 text-h1 text-on-surface outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      disabled={savingName || !nameInput.trim()}
                      onClick={onSaveName}
                      className="text-primary disabled:opacity-40"
                      aria-label="Save name"
                    >
                      <Icon name="check" style={{ fontSize: 22 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="text-secondary"
                      aria-label="Cancel"
                    >
                      <Icon name="close" style={{ fontSize: 22 }} />
                    </button>
                  </div>
                ) : (
                  <h1 className="group flex items-center gap-sm font-h1 text-h1 text-on-surface">
                    {project.name}
                    {canManageProject && (
                      <button
                        type="button"
                        onClick={onStartRename}
                        className="text-secondary opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                        aria-label="Rename project"
                      >
                        <Icon name="edit" style={{ fontSize: 18 }} />
                      </button>
                    )}
                  </h1>
                )}
                <p className="mt-base font-body-md text-body-md text-secondary">
                  {project.description || "No description yet."}
                </p>
              </div>
              <div className="flex items-center gap-sm">
                {org && org.role !== "OWNER" && upgradeOptions.length > 0 && !requestingUpgrade && (
                  <button
                    type="button"
                    disabled={upgradeRequested}
                    onClick={onStartRequestUpgrade}
                    className="flex items-center gap-xs rounded border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Icon name="upgrade" style={{ fontSize: 18 }} />
                    {upgradeRequested ? "Role Requested" : "Request a Different Role"}
                  </button>
                )}
                {requestingUpgrade && (
                  <div className="flex items-center gap-sm">
                    <Select
                      wrapperClassName="w-40"
                      value={upgradeRole}
                      onChange={(e) => setUpgradeRole(e.target.value as ProjectRole)}
                    >
                      {upgradeOptions.map((r) => (
                        <option key={r} value={r}>
                          {r.charAt(0) + r.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      disabled={upgradeSubmitting}
                      onClick={onRequestUpgrade}
                      className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                    >
                      {upgradeSubmitting ? "Sending..." : "Send Request"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestingUpgrade(false)}
                      className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {org && org.role !== "OWNER" && (
                  <button
                    type="button"
                    disabled={leaving}
                    onClick={onLeaveProject}
                    className="flex items-center gap-xs rounded border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
                  >
                    <Icon name="logout" style={{ fontSize: 18 }} />
                    {leaving ? "Leaving..." : "Leave Project"}
                  </button>
                )}
                {availableTypes.length > 0 && canManageProject && (
                  <button
                    type="button"
                    onClick={() => setShowNewEnv((v) => !v)}
                    className="flex items-center gap-xs rounded border border-primary bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary-container transition-all hover:brightness-110"
                  >
                    <Icon name="add" style={{ fontSize: 18 }} />
                    New Environment
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            {showNewEnv && (
              <form
                onSubmit={onCreateEnv}
                className="github-card mb-xl flex flex-col gap-md rounded-lg p-md"
              >
                <h2 className="font-h3 text-h3 text-on-surface">New Environment</h2>
                <Select
                  label="Type"
                  wrapperClassName="max-w-xs"
                  required
                  value={newEnvType}
                  onChange={(e) => setNewEnvType(e.target.value as EnvironmentType)}
                >
                    <option value="" disabled>
                      Choose type
                    </option>
                    {availableTypes.map((t) => (
                      <option key={t} value={t}>
                        {ENV_LABEL[t]}
                      </option>
                    ))}
                </Select>
                <div className="flex gap-sm">
                  <button
                    type="submit"
                    disabled={creatingEnv}
                    className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                  >
                    {creatingEnv ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewEnv(false)}
                    className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-4">
              {filteredEnvironments.map((env) =>
                env.access === "none" ? (
                  <div
                    key={env.id}
                    title="You don't have access to this environment"
                    className="github-card flex flex-col gap-md rounded-lg p-md opacity-60"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-secondary">
                      <Icon name="lock" />
                    </div>
                    <div>
                      <h3 className="flex items-center gap-xs font-h3 text-h3 text-on-surface">
                        {env.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-secondary">No access</p>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={env.id}
                    href={`/projects/${project.id}/environments/${env.id}`}
                    className="github-card flex flex-col gap-md rounded-lg p-md"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon name={ENV_ICON[env.type]} />
                    </div>
                    <div>
                      <h3 className="font-h3 text-h3 text-on-surface">{env.name}</h3>
                      <p className="font-body-sm text-body-sm text-secondary">
                        Created {new Date(env.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                )
              )}

              {environments.length === 0 && (
                <div className="github-card col-span-full flex flex-col items-center gap-sm rounded-lg p-xl text-center text-secondary">
                  <Icon name="dns" style={{ fontSize: 40 }} />
                  <p className="font-body-md text-body-md">
                    No environments yet. Create one to start adding secrets.
                  </p>
                </div>
              )}
              {environments.length > 0 && filteredEnvironments.length === 0 && (
                <div className="github-card col-span-full flex flex-col items-center gap-sm rounded-lg p-xl text-center text-secondary">
                  <p className="font-body-md text-body-md">
                    No environments match &ldquo;{search}&rdquo;.
                  </p>
                </div>
              )}
            </div>

            {org && (
              <ProjectMembers
                orgId={org.id}
                projectId={project.id}
                canManage={canManageProject}
                myRole={project.myRole}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
