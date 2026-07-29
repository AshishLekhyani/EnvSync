"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  ApiError,
  MemberSummary,
  Project,
} from "@/lib/api";

const audits = [
  {
    icon: "edit",
    iconClass: "text-primary",
    key: "STRIPE_API_KEY",
    project: "API Service",
    member: "Sarah Jenkins",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCLLC9hp2vfCqcnkVsqjJm0IfV1hKD9gnwCvtq82USjr8YpKaextJe42cUKdF-x1HQxLNay3YtNlDbJz-oxKwufvLUQxF-IhGzzvGtYK_t4qaGatA9XgOF-B1ZU2Cn3I2gpudONKNR3MzC-7P1s80OyFoAzUWRIPDxPTSKA12r613jpHafmzEwt-4KA9IgasElM7SsXekwcNlCjumZMXEG1Hk6kzPTYdYlMK_otOLgWEOOt_Q-_rBHH7jJTI35LibutKaRPlymDTINa",
    time: "2m ago",
  },
  {
    icon: "add",
    iconClass: "text-tertiary",
    key: "NEXT_PUBLIC_GA_ID",
    project: "Frontend Web",
    member: "Marcus Wei",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJLOcsJPPU5PNaX7q2nf8ePBpFvs9yQ12Nndf1EnqPo8ghJ_V-FY5YU6kWRid0VjP12biIndudsVFy_42kAe6V3dvgn-zIWsshaI7mP58jlpz61HYUya4x-BQQLOEUbTQGyUprRENpMGruZXmCI77PMc5Gqgofnq0QhoDMB7AZsF-sj0UmGSm3VZ9BoDIwH0EpOvxGAL7gpCBOSl-NVJTTVeCUdhJFnzgvL-VcyIsnn_WFbOq3HyoOGKMm9tr1tIG_CC8JBDJNxo0D",
    time: "45m ago",
  },
  {
    icon: "delete",
    iconClass: "text-error",
    key: "OLD_LEGACY_TOKEN",
    project: "Mobile App",
    member: "Robert Chen",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCpmEahEeuQhqHsrvXKok2K7GUtNqe1bulGJoV01r1ggXhaTe3a4zeXeFoIm920wgxq7SIpQUS5KH1Tm4-Z1E7vzl-vfSMQwC-SQjBzR-q7xVgnWK_OLxxCH85UuvO_y4nr_Tpz55p9vHDLyVlVk7psfIQ53DIk81hduJsziLuS8SJYNzDiDxPV7xWB4fDqH2oVCTDUi7iy2WEDzSs_Vwo0f5oLhHEtRrnOGYYuK1hlezl9KN4BJNsYjJX2Wsm2OFT7waRROlrJ5D6G",
    time: "2h ago",
  },
];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProjectsPage() {
  const { organizations, refreshMe } = useAuth();
  const org = organizations[0] ?? null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([api.listProjects(org.id), api.listMembers(org.id)])
      .then(([projectList, memberList]) => {
        if (cancelled) return;
        setProjects(projectList);
        setMembers(memberList);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load projects");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  const onCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    setCreatingOrg(true);
    setError(null);

    try {
      await api.createOrg({ name: orgName, slug: slugify(orgName) });
      await refreshMe();
      setOrgName("");
      setShowCreateOrg(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  };

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
      setProjects((prev) => [...prev, project]);
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
    <AppShell searchPlaceholder="Search projects...">
      <div className="mx-auto max-w-container-max pb-xl">
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
          <form
            onSubmit={onCreateOrg}
            className="github-card mb-xl flex flex-col gap-md rounded-lg p-md"
          >
            <h2 className="font-h3 text-h3 text-on-surface">Create Organization</h2>
            <label className="block">
              <span className="mb-xs block font-label-md text-label-md text-on-surface">
                Organization name
              </span>
              <input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Inc"
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
              />
            </label>
            <div className="flex gap-sm">
              <button
                type="submit"
                disabled={creatingOrg}
                className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
              >
                {creatingOrg ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateOrg(false)}
                className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
              >
                Cancel
              </button>
            </div>
          </form>
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
                {projects.map((project) => (
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
                    </div>
                    <div className="border-t border-outline-variant pt-sm font-body-sm text-body-sm text-secondary">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                  </Link>
                ))}

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
              <h2 className="mb-xs font-h2 text-h2 text-on-surface">Audit Activity</h2>
              <p className="mb-md font-body-sm text-body-sm text-secondary">
                Sample data — the audit log API lands in a later phase.
              </p>
              <div className="github-card overflow-hidden rounded-lg">
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
                    {audits.map((row) => (
                      <tr
                        key={row.key}
                        className="cursor-pointer transition-colors hover:bg-surface-bright"
                      >
                        <td className="px-md py-sm">
                          <div className="flex items-center gap-xs">
                            <Icon
                              name={row.icon}
                              className={row.iconClass}
                              style={{ fontSize: 18 }}
                            />
                            <span className="font-code-md text-code-md text-on-surface">
                              {row.key}
                            </span>
                          </div>
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface">
                          {row.project}
                        </td>
                        <td className="px-md py-sm">
                          <div className="flex items-center gap-xs">
                            <img
                              src={row.avatar}
                              alt=""
                              className="h-5 w-5 rounded-full object-cover"
                            />
                            <span className="font-body-sm text-body-sm text-on-surface">
                              {row.member}
                            </span>
                          </div>
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-secondary">
                          {row.time}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
