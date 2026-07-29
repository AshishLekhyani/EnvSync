"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  ApiError,
  EnvironmentSummary,
  EnvironmentType,
  Project,
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

export function SideNav() {
  const { organizations } = useAuth();
  const org = organizations[0] ?? null;
  const params = useParams<{ projectId?: string; environmentId?: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvType, setNewEnvType] = useState<EnvironmentType | "">("");
  const [creatingEnv, setCreatingEnv] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        let activeProject: Project | null = null;

        if (params.projectId) {
          activeProject = await api.getProject(params.projectId);
        } else {
          const projects = await api.listProjects(org.id);
          activeProject = projects[0] ?? null;
        }

        if (cancelled) return;
        setProject(activeProject);

        if (activeProject) {
          const envs = await api.listEnvironments(activeProject.id);
          if (!cancelled) setEnvironments(envs);
        } else {
          setEnvironments([]);
        }
      } catch {
        if (!cancelled) {
          setProject(null);
          setEnvironments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [org, params.projectId]);

  const availableTypes = ALL_ENV_TYPES.filter(
    (t) => !environments.some((env) => env.type === t)
  );

  const onCreateEnv = async (e: FormEvent) => {
    e.preventDefault();
    if (!project || !newEnvType) return;
    setCreatingEnv(true);
    setEnvError(null);

    try {
      const env = await api.createEnvironment(project.id, { type: newEnvType });
      setEnvironments((prev) => [...prev, env]);
      setShowNewEnv(false);
      setNewEnvType("");
    } catch (err) {
      setEnvError(err instanceof ApiError ? err.message : "Failed to create environment");
    } finally {
      setCreatingEnv(false);
    }
  };

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-base border-r border-outline-variant bg-surface-container-low p-md md:flex">
      <div className="mb-md flex items-center gap-md px-md py-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary">
          <Icon name="security" style={{ fontSize: 18 }} />
        </div>
        <div>
          <div className="font-label-md text-label-md font-bold leading-none text-on-surface">
            {project ? project.name : "No project"}
          </div>
          <div className="mt-xs font-body-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
            {project ? project.slug : "—"}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-md text-secondary">
          <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 20 }} />
        </div>
      ) : project ? (
        <div className="flex flex-col gap-xs">
          {environments.map((env) => {
            const active = env.id === params.environmentId;
            return (
              <Link
                key={env.id}
                href={`/projects/${project.id}/environments/${env.id}`}
                className={
                  active
                    ? "flex cursor-pointer items-center gap-md rounded-lg bg-primary-container px-md py-sm text-on-primary-container shadow-sm duration-150 active:scale-95"
                    : "flex cursor-pointer items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high active:scale-95"
                }
              >
                <Icon name={ENV_ICON[env.type]} />
                <span className="font-label-md text-label-md">{env.name}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="px-md font-body-sm text-body-sm text-secondary">
          Create a project to add environments.
        </p>
      )}

      {project &&
        (showNewEnv ? (
          <form
            onSubmit={onCreateEnv}
            className="mx-md mt-md flex flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container p-sm"
          >
            <select
              required
              aria-label="Environment type"
              value={newEnvType}
              onChange={(e) => setNewEnvType(e.target.value as EnvironmentType)}
              className="rounded border border-outline-variant bg-surface-container-low px-xs py-1 font-body-sm text-body-sm text-on-surface"
            >
              <option value="" disabled>
                Choose type
              </option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {ENV_LABEL[t]}
                </option>
              ))}
            </select>
            {envError && (
              <p className="font-body-sm text-[11px] text-[#CF222E] dark:text-red-400">
                {envError}
              </p>
            )}
            <div className="flex gap-xs">
              <button
                type="submit"
                disabled={creatingEnv || !newEnvType}
                className="flex-1 rounded bg-primary-container py-1 font-label-md text-[11px] text-on-primary disabled:opacity-60"
              >
                {creatingEnv ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowNewEnv(false)}
                className="rounded border border-outline-variant px-sm py-1 font-label-md text-[11px] text-on-surface"
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
              className="mx-md mt-md flex items-center justify-center gap-xs rounded-lg border border-primary bg-primary-container py-sm font-label-md text-label-md text-on-primary-container transition-all hover:brightness-110"
            >
              <Icon name="add" style={{ fontSize: 18 }} />
              New Environment
            </button>
          )
        ))}

      <div className="mt-auto flex flex-col gap-xs border-t border-outline-variant pt-md">
        <a
          href="#"
          className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="description" />
          <span className="font-label-md text-label-md">Docs</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="contact_support" />
          <span className="font-label-md text-label-md">Support</span>
        </a>
      </div>
    </aside>
  );
}
