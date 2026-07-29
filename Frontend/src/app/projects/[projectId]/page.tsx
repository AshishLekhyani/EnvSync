"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
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

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewEnv, setShowNewEnv] = useState(false);
  const [newEnvType, setNewEnvType] = useState<EnvironmentType | "">("");
  const [creatingEnv, setCreatingEnv] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([api.getProject(projectId), api.listEnvironments(projectId)])
      .then(([proj, envs]) => {
        if (cancelled) return;
        setProject(proj);
        setEnvironments(envs);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load project");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

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
      setEnvironments((prev) => [...prev, env]);
      setShowNewEnv(false);
      setNewEnvType("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create environment");
    } finally {
      setCreatingEnv(false);
    }
  };

  return (
    <AppShell searchPlaceholder="Search environments...">
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
            {error ?? "Project not found."}
          </div>
        ) : (
          <>
            <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-center">
              <div>
                <h1 className="font-h1 text-h1 text-on-surface">{project.name}</h1>
                <p className="mt-base font-body-md text-body-md text-secondary">
                  {project.description || "No description yet."}
                </p>
              </div>
              {availableTypes.length > 0 && (
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
                <label className="block max-w-xs">
                  <span className="mb-xs block font-label-md text-label-md text-on-surface">
                    Type
                  </span>
                  <select
                    required
                    value={newEnvType}
                    onChange={(e) => setNewEnvType(e.target.value as EnvironmentType)}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
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
                </label>
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
              {environments.map((env) => (
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
              ))}

              {environments.length === 0 && (
                <div className="github-card col-span-full flex flex-col items-center gap-sm rounded-lg p-xl text-center text-secondary">
                  <Icon name="dns" style={{ fontSize: 40 }} />
                  <p className="font-body-md text-body-md">
                    No environments yet. Create one to start adding secrets.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
