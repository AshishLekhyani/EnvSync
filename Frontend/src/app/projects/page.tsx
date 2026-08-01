"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { assignableRoles } from "@/lib/roles";
import {
  api,
  ApiError,
  AuditLogEntry,
  Project,
  ProjectCreateAutoApproveRuleSummary,
  ProjectCreationRequestSummary,
  ProjectRole,
} from "@/lib/api";
import { getActionDisplay } from "@/lib/auditActions";

function PendingProjectRequests({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.orgProjectCreationRequests(orgId),
    queryFn: () => api.listProjectCreationRequests(orgId),
  });
  const requests = requestsQuery.data ?? [];

  const onDecision = async (requestId: string, decision: "approve" | "reject") => {
    setDecidingId(requestId);
    setError(null);
    try {
      if (decision === "approve") {
        await api.approveProjectCreationRequest(orgId, requestId);
        await queryClient.invalidateQueries({ queryKey: queryKeys.orgProjects(orgId) });
      } else {
        await api.rejectProjectCreationRequest(orgId, requestId);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orgProjectCreationRequests(orgId),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update request");
    } finally {
      setDecidingId(null);
    }
  };

  if (!requestsQuery.isPending && requests.length === 0) {
    return null;
  }

  return (
    <div className="github-card mb-xl overflow-hidden rounded-lg">
      <div className="border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">
          Pending Project Requests
          <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
            {requests.length}
          </span>
        </h3>
      </div>
      <div className="flex flex-col divide-y divide-outline-variant">
        {error && (
          <p className="p-md font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
            {error}
          </p>
        )}
        {requests.map((r: ProjectCreationRequestSummary) => (
          <div key={r.id} className="flex items-center justify-between gap-md px-md py-sm">
            <div>
              <p className="font-body-sm text-body-sm text-on-surface">
                <span className="font-bold">{r.requestedBy.name}</span> wants to create{" "}
                <span className="font-bold">{r.name}</span>
              </p>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                {r.requestedBy.email} · {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-sm">
              <button
                type="button"
                disabled={decidingId === r.id}
                onClick={() => onDecision(r.id, "approve")}
                className="rounded-lg bg-primary-container px-sm py-1 font-label-md text-[11px] text-on-primary disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={decidingId === r.id}
                onClick={() => onDecision(r.id, "reject")}
                className="rounded-lg border border-outline-variant px-sm py-1 font-label-md text-[11px] text-on-surface disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectCreateAutoApprove({
  orgId,
  admins,
}: {
  orgId: string;
  admins: { membershipId: string; user: { id: string; name: string; email: string } }[];
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const rulesQuery = useQuery({
    queryKey: queryKeys.orgProjectCreateAutoApprove(orgId),
    queryFn: () => api.listCreateAutoApproveRules(orgId),
  });
  const rules = rulesQuery.data ?? [];
  const enabledIds = new Set(rules.map((r: ProjectCreateAutoApproveRuleSummary) => r.admin.id));

  const toggle = async (adminId: string, enabled: boolean) => {
    setPendingId(adminId);
    setError(null);
    try {
      if (enabled) {
        await api.disableCreateAutoApprove(orgId, adminId);
      } else {
        await api.enableCreateAutoApprove(orgId, adminId);
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orgProjectCreateAutoApprove(orgId),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setPendingId(null);
    }
  };

  if (admins.length === 0) return null;

  return (
    <div className="github-card mb-xl overflow-hidden rounded-lg">
      <div className="border-b border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">
          Auto-Approve Project Creation
        </h3>
        <p className="mt-xs font-body-sm text-[11px] text-on-surface-variant">
          Admin-created projects normally need your approval. Turn this on for an Admin you
          trust to skip that step for them.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-outline-variant p-md">
        {error && (
          <p className="pb-sm font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
            {error}
          </p>
        )}
        {admins.map((m) => {
          const enabled = enabledIds.has(m.user.id);
          return (
            <label
              key={m.membershipId}
              className="flex items-center justify-between gap-md py-sm"
            >
              <span className="font-body-sm text-body-sm text-on-surface">
                {m.user.name} <span className="text-on-surface-variant">({m.user.email})</span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={pendingId === m.user.id}
                onChange={() => toggle(m.user.id, enabled)}
                className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ProjectsPageContent() {
  const { activeOrg: org, refreshMe, switchOrg } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: queryKeys.orgProjects(org?.id ?? ""),
    queryFn: () => api.listProjects(org!.id),
    enabled: !!org,
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.orgMembers(org?.id ?? ""),
    queryFn: () => api.listMembers(org!.id),
    enabled: !!org,
  });

  const projects = projectsQuery.data ?? [];
  const members = membersQuery.data ?? [];
  const loading = projectsQuery.isPending || membersQuery.isPending;
  const [error, setError] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const canCreateProject = !!org;
  const admins = members.filter((m) => m.role !== "OWNER");

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditForbidden, setAuditForbidden] = useState(false);

  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [requestingProjectId, setRequestingProjectId] = useState<string | null>(null);
  const [requestRole, setRequestRole] = useState<ProjectRole | "">("");
  const onRequestAccess = async (projectId: string, role?: ProjectRole) => {
    if (!org) return;
    try {
      await api.requestProjectAccess(org.id, projectId, role || undefined);
      setRequestedIds((prev) => new Set(prev).add(projectId));
      setRequestingProjectId(null);
      setRequestRole("");
    } catch {
      /* the button just stays clickable to retry */
    }
  };

  useEffect(() => {
    if (!org) {
      setAuditLoading(false);
      return;
    }

    let cancelled = false;
    setAuditLoading(true);

    api
      .listAuditLogs(org.id, { limit: 5 })
      .then((logs) => {
        if (!cancelled) {
          setAuditLogs(logs as AuditLogEntry[]);
          setAuditForbidden(false);
        }
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 403) {
          setAuditForbidden(true);
        }
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  const onOrgCreated = async (newOrg: { id: string; name: string; slug: string }) => {
    await refreshMe();
    switchOrg(newOrg.id);
    setShowCreateOrg(false);
  };

  const createFlag = searchParams.get("create");

  useEffect(() => {
    if (createFlag === "1" && org && canCreateProject) {
      setShowCreateProject(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createFlag, org]);

  const filteredProjects = search.trim()
    ? projects.filter((p) => {
        const q = search.trim().toLowerCase();
        return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      })
    : projects;

  const onCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    const slug = slugify(projectName);
    if (!slug) {
      setError("Project name must contain at least one letter or number.");
      return;
    }
    setCreatingProject(true);
    setError(null);
    setPendingNotice(null);

    try {
      const result = await api.createProject(org.id, {
        name: projectName,
        slug,
        description: projectDescription || undefined,
      });
      if (result.status === "created") {
        queryClient.setQueryData<Project[]>(
          queryKeys.orgProjects(org.id),
          (prev) => [...(prev ?? []), result.project]
        );
      } else {
        setPendingNotice(
          `"${result.request.name}" needs owner approval before it's created.`
        );
      }
      setProjectName("");
      setProjectDescription("");
      setShowCreateProject(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project");
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <AppShell searchPlaceholder="Search projects..." onSearch={setSearch}>
      <div className="mx-auto max-w-container-max pb-xl">
        {org && search.trim() && (
          <p className="mb-md font-body-sm text-body-sm text-secondary">
            Showing results for &ldquo;{search}&rdquo;
          </p>
        )}
        <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">EnvSync Projects</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              {org
                ? `Manage environment variables and secrets for ${org.name}.`
                : "Create an organization to start managing environment variables."}
            </p>
          </div>
          {org && canCreateProject && (
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={() => setShowCreateProject((v) => !v)}
                className="flex items-center gap-xs rounded border border-primary bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary-container transition-all hover:brightness-110"
              >
                <Icon name="add" style={{ fontSize: 18 }} />
                Create Project
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {pendingNotice && (
          <div className="mb-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-md py-sm font-body-sm text-body-sm text-amber-700 dark:text-amber-400">
            {pendingNotice}
          </div>
        )}

        {org && org.role === "OWNER" && <PendingProjectRequests orgId={org.id} />}
        {org && org.role === "OWNER" && (
          <ProjectCreateAutoApprove orgId={org.id} admins={admins} />
        )}

        {!org && !showCreateOrg && (
          <div className="github-card flex flex-col items-center gap-md rounded-lg p-xl text-center">
            <Icon name="corporate_fare" className="text-primary" style={{ fontSize: 40 }} />
            <div>
              <h2 className="font-h3 text-h3 text-on-surface">No organization yet</h2>
              <p className="mt-xs font-body-sm text-body-sm text-secondary">
                Create an organization to start creating projects and secrets.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateOrg(true)}
              className="rounded-lg bg-primary-container px-lg py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90"
            >
              Create Organization
            </button>
          </div>
        )}

        {showCreateOrg && (
          <div className="github-card mb-xl rounded-lg p-md">
            <h2 className="mb-md font-h3 text-h3 text-on-surface">Create Organization</h2>
            <CreateOrgForm
              onCreated={onOrgCreated}
              onCancel={() => setShowCreateOrg(false)}
            />
          </div>
        )}

        {org && (
          <>
            <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-3">
              <div className="github-card flex items-center gap-md rounded-lg p-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <Icon name="folder" />
                </div>
                <div>
                  <div className="font-body-sm text-body-sm text-secondary">Projects</div>
                  <div className="font-h2 text-h2 text-on-surface">{projects.length}</div>
                </div>
              </div>
              <div className="github-card flex items-center gap-md rounded-lg p-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                  <Icon name="group" />
                </div>
                <div>
                  <div className="font-body-sm text-body-sm text-secondary">Members</div>
                  <div className="font-h2 text-h2 text-on-surface">{members.length}</div>
                </div>
              </div>
              <div className="github-card flex items-center gap-md rounded-lg p-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface">
                  <Icon name="badge" />
                </div>
                <div>
                  <div className="font-body-sm text-body-sm text-secondary">Your role</div>
                  <div className="font-h2 text-h2 text-on-surface">{org.role}</div>
                </div>
              </div>
            </div>

            {showCreateProject && (
              <form
                onSubmit={onCreateProject}
                className="github-card mb-xl flex flex-col gap-md rounded-lg p-md"
              >
                <h2 className="font-h3 text-h3 text-on-surface">Create Project</h2>
                <label className="block">
                  <span className="mb-xs block font-label-md text-label-md text-on-surface">
                    Project name
                  </span>
                  <input
                    required
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Core API"
                    maxLength={100}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                  />
                </label>
                <label className="block">
                  <span className="mb-xs block font-label-md text-label-md text-on-surface">
                    Description (optional)
                  </span>
                  <input
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="What does this project do?"
                    maxLength={500}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                  />
                </label>
                <div className="flex gap-sm">
                  <button
                    type="submit"
                    disabled={creatingProject}
                    className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                  >
                    {creatingProject ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(false)}
                    className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="flex justify-center py-xl text-secondary">
                <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 28 }} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.length === 0 && search.trim() && (
                  <p className="col-span-full py-xl text-center font-body-sm text-body-sm text-secondary">
                    No projects match your search.
                  </p>
                )}
                {filteredProjects.map((project) =>
                  project.hasAccess === false ? (
                    <div
                      key={project.id}
                      className="github-card flex min-h-[180px] flex-col justify-between rounded-lg p-md opacity-80"
                    >
                      <div>
                        <div className="mb-sm flex items-start justify-between">
                          <h3 className="flex items-center gap-xs font-h3 text-h3 text-on-surface">
                            <Icon name="lock" className="text-secondary" style={{ fontSize: 18 }} />
                            {project.name}
                          </h3>
                          <span className="rounded bg-surface-container-highest px-xs py-[2px] font-code-sm text-code-sm text-on-surface-variant">
                            {project.slug}
                          </span>
                        </div>
                        <p className="mb-md font-body-sm text-body-sm text-secondary">
                          You don&apos;t have access to this project yet.
                        </p>
                      </div>
                      {project.hasPendingAccessRequest || requestedIds.has(project.id) ? (
                        <button
                          type="button"
                          disabled
                          className="rounded-lg border border-primary/40 px-md py-sm font-label-md text-label-md text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Access Requested
                        </button>
                      ) : requestingProjectId === project.id ? (
                        <div className="flex flex-col gap-sm">
                          <Select
                            wrapperClassName="w-full"
                            value={requestRole}
                            onChange={(e) => setRequestRole(e.target.value as ProjectRole)}
                          >
                            <option value="">Just view access</option>
                            {assignableRoles("OWNER").map((r) => (
                              <option key={r} value={r}>
                                {r.charAt(0) + r.slice(1).toLowerCase()}
                              </option>
                            ))}
                          </Select>
                          <div className="flex gap-sm">
                            <button
                              type="button"
                              onClick={() => onRequestAccess(project.id, requestRole || undefined)}
                              className="flex-1 rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary transition-colors hover:opacity-90"
                            >
                              Send Request
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRequestingProjectId(null);
                                setRequestRole("");
                              }}
                              className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRequestingProjectId(project.id)}
                          className="rounded-lg border border-primary/40 px-md py-sm font-label-md text-label-md text-primary transition-colors hover:bg-primary/5"
                        >
                          Request Access
                        </button>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="github-card active-project-accent flex min-h-[180px] flex-col justify-between rounded-lg p-md"
                    >
                      <div>
                        <div className="mb-sm flex items-start justify-between">
                          <h3 className="font-h3 text-h3 text-on-surface">{project.name}</h3>
                          <span className="rounded bg-surface-container-highest px-xs py-[2px] font-code-sm text-code-sm text-on-surface-variant">
                            {project.slug}
                          </span>
                        </div>
                        <p className="mb-md line-clamp-2 font-body-sm text-body-sm text-secondary">
                          {project.description || "No description yet."}
                        </p>
                        <div className="flex items-center gap-xs font-body-sm text-body-sm text-secondary">
                          <Icon name="dns" style={{ fontSize: 16 }} />
                          {project.environmentCount}{" "}
                          environment{project.environmentCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="border-t border-outline-variant pt-sm font-body-sm text-body-sm text-secondary">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </Link>
                  )
                )}

                {canCreateProject && (
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(true)}
                    className="github-card group flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border-dashed p-md text-secondary transition-all hover:border-primary hover:text-primary"
                  >
                    <Icon
                      name="add_circle"
                      className="transition-transform group-hover:scale-110"
                      style={{ fontSize: 48 }}
                    />
                    <span className="font-label-md text-label-md">New Project Container</span>
                  </button>
                )}
              </div>
            )}

            <div className="mt-xl">
              <h2 className="mb-md font-h2 text-h2 text-on-surface">Audit Activity</h2>
              <div className="github-card overflow-hidden rounded-lg">
                {auditLoading ? (
                  <div className="flex justify-center py-lg text-secondary">
                    <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
                  </div>
                ) : auditForbidden ? (
                  <p className="px-md py-lg text-center font-body-sm text-body-sm text-secondary">
                    You don&apos;t have access to any project&apos;s audit activity yet.
                  </p>
                ) : auditLogs.length === 0 ? (
                  <p className="px-md py-lg text-center font-body-sm text-body-sm text-secondary">
                    No activity yet.
                  </p>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead className="border-b border-outline-variant bg-surface-container-low">
                      <tr>
                        {["Action", "Project", "Member", "Time"].map((h) => (
                          <th
                            key={h}
                            className="px-md py-sm font-label-md text-label-md text-on-surface"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {auditLogs.map((log) => {
                        const display = getActionDisplay(log.action);
                        const key =
                          (log.metadata?.key as string | undefined) ??
                          (log.metadata?.email as string | undefined) ??
                          (log.metadata?.name as string | undefined) ??
                          (log.metadata?.newName as string | undefined) ??
                          log.targetType ??
                          "—";
                        return (
                          <tr
                            key={log.id}
                            className="transition-colors hover:bg-surface-bright"
                          >
                            <td className="px-md py-sm">
                              <div className="flex items-center gap-xs">
                                <Icon
                                  name={display.icon}
                                  className={display.iconClass}
                                  style={{ fontSize: 18 }}
                                />
                                <span className="font-code-md text-code-md text-on-surface">
                                  {key}
                                </span>
                              </div>
                            </td>
                            <td className="px-md py-sm font-body-sm text-body-sm text-on-surface">
                              {log.project?.name ?? "—"}
                            </td>
                            <td className="px-md py-sm font-body-sm text-body-sm text-on-surface">
                              {log.actor?.name ?? "Unknown"}
                            </td>
                            <td className="px-md py-sm font-body-sm text-body-sm text-secondary">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageContent />
    </Suspense>
  );
}
