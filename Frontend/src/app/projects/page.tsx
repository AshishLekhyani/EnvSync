"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import {
  api,
  ApiError,
  AuditLogEntry,
  Project,
} from "@/lib/api";
import { getActionDisplay } from "@/lib/auditActions";

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
  const [search, setSearch] = useState("");

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditForbidden, setAuditForbidden] = useState(false);

  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const onRequestAccess = async (projectId: string) => {
    if (!org) return;
    try {
      await api.requestProjectAccess(org.id, projectId);
      setRequestedIds((prev) => new Set(prev).add(projectId));
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
    if (createFlag === "1" && org) {
      setShowCreateProject(true);
    }
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
    setCreatingProject(true);
    setError(null);

    try {
      const project = await api.createProject(org.id, {
        name: projectName,
        slug: slugify(projectName),
        description: projectDescription || undefined,
      });
      queryClient.setQueryData<Project[]>(
        queryKeys.orgProjects(org.id),
        (prev) => [...(prev ?? []), project]
      );
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
          {org && (
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
                      <button
                        type="button"
                        disabled={project.hasPendingAccessRequest || requestedIds.has(project.id)}
                        onClick={() => onRequestAccess(project.id)}
                        className="rounded-lg border border-primary/40 px-md py-sm font-label-md text-label-md text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {project.hasPendingAccessRequest || requestedIds.has(project.id)
                          ? "Access Requested"
                          : "Request Access"}
                      </button>
                    </div>
                  ) : (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="github-card flex min-h-[180px] flex-col justify-between rounded-lg p-md"
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
                    Audit activity requires Developer access or higher.
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
