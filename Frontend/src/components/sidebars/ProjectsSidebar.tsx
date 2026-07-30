"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../Icon";
import { Select } from "../Select";
import { Modal } from "../Modal";
import { CreateOrgForm } from "../CreateOrgForm";
import { SidebarFooterLinks } from "./SidebarFooterLinks";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import {
  api,
  ApiError,
  EnvironmentSummary,
  EnvironmentType,
} from "@/lib/api";

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

function EnvironmentList({ projectId }: { projectId: string }) {
  const params = useParams<{ environmentId?: string }>();
  const queryClient = useQueryClient();

  const environmentsQuery = useQuery({
    queryKey: queryKeys.projectEnvironments(projectId),
    queryFn: () => api.listEnvironments(projectId),
  });
  const environments = environmentsQuery.data ?? [];

  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvType, setNewEnvType] = useState<EnvironmentType | "">("");
  const [creatingEnv, setCreatingEnv] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  const availableTypes = ALL_ENV_TYPES.filter(
    (t) => !environments.some((env) => env.type === t)
  );

  const onCreateEnv = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEnvType) return;
    setCreatingEnv(true);
    setEnvError(null);

    try {
      const env = await api.createEnvironment(projectId, { type: newEnvType });
      queryClient.setQueryData<EnvironmentSummary[]>(
        queryKeys.projectEnvironments(projectId),
        (prev) => [...(prev ?? []), env]
      );
      setShowNewEnv(false);
      setNewEnvType("");
    } catch (err) {
      setEnvError(err instanceof ApiError ? err.message : "Failed to create environment");
    } finally {
      setCreatingEnv(false);
    }
  };

  if (environmentsQuery.isPending) {
    return (
      <div className="flex justify-center py-sm text-secondary">
        <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 16 }} />
      </div>
    );
  }

  return (
    <div className="ml-md flex flex-col gap-xs border-l border-outline-variant pl-md">
      {environments.map((env) => {
        const active = env.id === params.environmentId;
        return (
          <Link
            key={env.id}
            href={`/projects/${projectId}/environments/${env.id}`}
            className={
              active
                ? "flex items-center gap-xs rounded-lg bg-primary-container px-sm py-1 text-[13px] text-on-primary-container shadow-sm"
                : "flex items-center gap-xs rounded-lg px-sm py-1 text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-high"
            }
          >
            <Icon name={ENV_ICON[env.type]} style={{ fontSize: 16 }} />
            {env.name}
          </Link>
        );
      })}

      {showNewEnv ? (
        <form onSubmit={onCreateEnv} className="mt-xs flex flex-col gap-xs">
          <Select
            required
            aria-label="Environment type"
            value={newEnvType}
            onChange={(e) => setNewEnvType(e.target.value as EnvironmentType)}
            className="px-xs py-1 text-[12px]"
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
          {envError && (
            <p className="font-body-sm text-[10px] text-[#CF222E] dark:text-red-400">
              {envError}
            </p>
          )}
          <div className="flex gap-xs">
            <button
              type="submit"
              disabled={creatingEnv || !newEnvType}
              className="flex-1 rounded bg-primary-container py-1 font-label-md text-[10px] text-on-primary disabled:opacity-60"
            >
              {creatingEnv ? "Adding..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewEnv(false)}
              className="rounded border border-outline-variant px-sm py-1 font-label-md text-[10px] text-on-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        availableTypes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowNewEnv(true)}
            className="mt-xs flex items-center gap-xs rounded-lg border border-primary/40 px-sm py-1 text-[11px] text-primary transition-colors hover:bg-primary/5"
          >
            <Icon name="add" style={{ fontSize: 14 }} />
            New Environment
          </button>
        )
      )}
    </div>
  );
}

export function ProjectsSidebar() {
  const { activeOrg: org, refreshMe, switchOrg } = useAuth();
  const params = useParams<{ projectId?: string }>();
  const router = useRouter();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const onOrgCreated = async (newOrg: { id: string }) => {
    await refreshMe();
    switchOrg(newOrg.id);
    setShowCreateOrg(false);
  };

  const projectsQuery = useQuery({
    queryKey: queryKeys.orgProjects(org?.id ?? ""),
    queryFn: () => api.listProjects(org!.id),
    enabled: !!org,
  });
  const projects = projectsQuery.data ?? [];

  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    params.projectId ?? null
  );

  // Landing directly on a project's page still shows it expanded by default,
  // without overriding a manual expand/collapse of a *different* row.
  useEffect(() => {
    if (params.projectId) setExpandedProjectId(params.projectId);
  }, [params.projectId]);

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-base border-r border-outline-variant bg-surface-container-low p-md md:flex">
        <p className="px-md font-body-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
          Projects
        </p>
        <div className="flex flex-col gap-xs overflow-y-auto">
          {!org ? (
            <div className="flex flex-col items-start gap-sm px-md py-sm">
              <p className="font-body-sm text-body-sm text-secondary">
                No organization yet. Create one to start adding projects.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateOrg(true)}
                className="flex items-center gap-xs rounded-lg border border-primary/40 px-sm py-1 text-[12px] text-primary transition-colors hover:bg-primary/5"
              >
                <Icon name="add" style={{ fontSize: 14 }} />
                Create Organization
              </button>
            </div>
          ) : projectsQuery.isPending ? (
            <div className="flex justify-center py-md text-secondary">
              <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 20 }} />
            </div>
          ) : projects.length === 0 ? (
            <p className="px-md font-body-sm text-body-sm text-secondary">
              No projects yet.
            </p>
          ) : (
            projects.map((project) => {
              const active = project.id === params.projectId;
              const expanded = project.id === expandedProjectId;
              return (
                <div key={project.id} className="flex flex-col gap-xs">
                  <div
                    role="button"
                    tabIndex={0}
                    title="Click to expand, double-click to open"
                    onClick={() =>
                      setExpandedProjectId((prev) => (prev === project.id ? null : project.id))
                    }
                    onDoubleClick={() => router.push(`/projects/${project.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/projects/${project.id}`);
                    }}
                    className={
                      active
                        ? "flex cursor-pointer items-center justify-between gap-xs rounded-lg bg-surface-container-high px-md py-sm text-on-surface"
                        : "flex cursor-pointer items-center justify-between gap-xs rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
                    }
                  >
                    <span className="flex items-center gap-xs truncate font-label-md text-label-md">
                      <Icon name="folder" style={{ fontSize: 18 }} />
                      <span className="truncate">{project.name}</span>
                    </span>
                    <span className="flex-shrink-0 rounded-full bg-surface-container-highest px-xs text-[10px] text-on-surface-variant">
                      {project.environmentCount}
                    </span>
                  </div>
                  {expanded && <EnvironmentList projectId={project.id} />}
                </div>
              );
            })
          )}
        </div>

        <SidebarFooterLinks />
      </aside>

      <nav className="flex gap-xs overflow-x-auto border-b border-outline-variant bg-surface px-md py-sm md:hidden">
        {projects.map((project) => {
          const active = project.id === params.projectId;
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={
                active
                  ? "flex flex-shrink-0 items-center gap-xs rounded-lg bg-primary-container px-md py-sm text-on-primary-container"
                  : "flex flex-shrink-0 items-center gap-xs rounded-lg px-md py-sm text-on-surface-variant"
              }
            >
              <Icon name="folder" style={{ fontSize: 18 }} />
              <span className="font-label-md text-label-md">{project.name}</span>
            </Link>
          );
        })}
      </nav>

      <Modal
        open={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        title="Create Organization"
      >
        <CreateOrgForm onCreated={onOrgCreated} onCancel={() => setShowCreateOrg(false)} />
      </Modal>
    </>
  );
}
