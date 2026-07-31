"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, EnvironmentSummary, Project } from "@/lib/api";

export function IntegrationSnippet({
  filename,
  buildCode,
}: {
  filename: string;
  buildCode: (projectId: string, environmentId: string) => string;
}) {
  const { activeOrg: org } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .listProjects(org.id)
      .then((list) => {
        if (cancelled) return;
        setProjects(list);
        setSelectedProjectId(list[0]?.id ?? "");
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load projects");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  useEffect(() => {
    if (!selectedProjectId) {
      setEnvironments([]);
      setSelectedEnvironmentId("");
      return;
    }

    let cancelled = false;

    api
      .listEnvironments(selectedProjectId)
      .then((list) => {
        if (cancelled) return;
        setEnvironments(list);
        setSelectedEnvironmentId(list[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setEnvironments([]);
          setSelectedEnvironmentId("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 3000);
    } catch {
      /* ignore */
    }
  };

  const projectId = selectedProjectId || "<project-id>";
  const environmentId = selectedEnvironmentId || "<environment-id>";
  const code = buildCode(projectId, environmentId);

  return (
    <div className="flex flex-col gap-md">
      {error && (
        <div className="rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {!org ? (
        <div className="github-card rounded-lg p-lg text-center font-body-md text-body-md text-secondary">
          Create an organization on the Projects page first.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-lg text-secondary">
          <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md sm:flex-row sm:items-end">
            <Select
              label="Project"
              wrapperClassName="flex-1"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.length === 0 && <option value="">No projects yet</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select
              label="Environment"
              wrapperClassName="flex-1"
              value={selectedEnvironmentId}
              onChange={(e) => setSelectedEnvironmentId(e.target.value)}
            >
              {environments.length === 0 && <option value="">No environments yet</option>}
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#30363D]">
            <div className="code-block-header flex items-center justify-between px-md py-sm">
              <span className="font-code-sm text-code-sm text-[#8B949E]">{filename}</span>
              <button
                type="button"
                onClick={() => copyText(code)}
                className="flex items-center gap-xs font-label-md text-xs text-on-primary-fixed-variant transition-colors hover:text-primary-container"
              >
                <Icon name="content_copy" className="text-sm" />
                Copy
              </button>
            </div>
            <pre className="code-block-body overflow-x-auto p-md">
              <code className="font-code-md text-code-md text-[#E6EDF3]">{code}</code>
            </pre>
          </div>
        </>
      )}

      <div
        className={`copy-toast fixed bottom-lg right-lg z-[100] flex items-center gap-md rounded-xl bg-inverse-surface px-lg py-md text-inverse-on-surface shadow-xl ${
          showToast ? "show" : ""
        }`}
      >
        <Icon name="check_circle" className="text-primary-fixed-dim" />
        <div>
          <p className="font-body-md text-body-md font-bold">Copied to Clipboard</p>
          <p className="font-body-sm text-body-sm opacity-80">Ready to paste.</p>
        </div>
      </div>
    </div>
  );
}
