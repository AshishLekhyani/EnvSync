"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, EnvironmentSummary, Project } from "@/lib/api";

function CodeSnippet({
  label,
  filename,
  code,
  onCopy,
}: {
  label: string;
  filename: string;
  code: string;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#30363D]">
      <div className="code-block-header flex items-center justify-between px-md py-sm">
        <span className="font-code-sm text-code-sm text-[#8B949E]">{filename}</span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-xs font-label-md text-xs text-on-primary-fixed-variant transition-colors hover:text-primary-container"
        >
          <Icon name="content_copy" className="text-sm" />
          Copy
        </button>
      </div>
      <pre className="code-block-body overflow-x-auto p-md">
        <code className="font-code-md text-code-md text-[#E6EDF3]" aria-label={label}>
          {code}
        </code>
      </pre>
    </div>
  );
}

export default function IntegrationsPage() {
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

  const githubActionsSnippet = `- name: Pull secrets from EnvSync
  run: npx envsync-cli pull --project ${projectId} --environment ${environmentId}
  env:
    ENVSYNC_TOKEN: \${{ secrets.ENVSYNC_TOKEN }}`;

  const dockerSnippet = `FROM node:20-slim
RUN npm install -g envsync-cli
COPY . .
ENTRYPOINT ["envsync", "run", "--project", "${projectId}", "--environment", "${environmentId}", "--", "node", "server.js"]`;

  const vercelSnippet = `{
  "scripts": {
    "build": "envsync run --project ${projectId} --environment ${environmentId} -- next build"
  }
}`;

  const awsSnippet = `envsync pull --project ${projectId} --environment ${environmentId} --out .env
aws secretsmanager put-secret-value \\
  --secret-id my-app/${environmentId} \\
  --secret-string file://.env`;

  return (
    <AppShell showSearch={false} mainClassName="mx-auto w-full max-w-container-max flex-1 p-md lg:p-xl">
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface">Integrations</h1>
        <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
          Ready-to-use snippets for pulling EnvSync secrets into your existing pipelines.
          Generate a service token on the{" "}
          <a href="/settings" className="text-primary hover:underline">
            Settings
          </a>{" "}
          page first.
        </p>
      </div>

      {error && (
        <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {!org ? (
        <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
          Create an organization on the Projects page first.
        </div>
      ) : loading ? (
        <div className="flex justify-center py-xl text-secondary">
          <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 28 }} />
        </div>
      ) : (
        <>
          <div className="mb-lg flex flex-col gap-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md sm:flex-row sm:items-end">
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

          <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
            <div
              id="github-actions"
              className="flex scroll-mt-24 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]"
            >
              <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
                <Icon name="hub" className="text-primary" />
                <h2 className="font-h3 text-h3 text-on-surface">GitHub Actions</h2>
              </div>
              <div className="space-y-md p-md">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Add this step to your workflow to pull secrets before build/deploy.
                </p>
                <CodeSnippet
                  label="GitHub Actions step"
                  filename=".github/workflows/deploy.yml"
                  code={githubActionsSnippet}
                  onCopy={() => copyText(githubActionsSnippet)}
                />
              </div>
            </div>

            <div
              id="docker"
              className="flex scroll-mt-24 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]"
            >
              <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
                <Icon name="deployed_code" className="text-primary" />
                <h2 className="font-h3 text-h3 text-on-surface">Docker</h2>
              </div>
              <div className="space-y-md p-md">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Use the CLI as your container entrypoint to inject secrets at runtime.
                </p>
                <CodeSnippet
                  label="Dockerfile"
                  filename="Dockerfile"
                  code={dockerSnippet}
                  onCopy={() => copyText(dockerSnippet)}
                />
              </div>
            </div>

            <div
              id="vercel"
              className="flex scroll-mt-24 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]"
            >
              <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
                <Icon name="bolt" className="text-primary" />
                <h2 className="font-h3 text-h3 text-on-surface">Vercel</h2>
              </div>
              <div className="space-y-md p-md">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Wrap your build command so EnvSync is the source of truth at build time.
                </p>
                <CodeSnippet
                  label="package.json build script"
                  filename="package.json"
                  code={vercelSnippet}
                  onCopy={() => copyText(vercelSnippet)}
                />
              </div>
            </div>

            <div
              id="aws"
              className="flex scroll-mt-24 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]"
            >
              <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
                <Icon name="lock" className="text-primary" />
                <h2 className="font-h3 text-h3 text-on-surface">AWS Secrets Manager</h2>
              </div>
              <div className="space-y-md p-md">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Sync EnvSync into AWS as part of your deploy pipeline.
                </p>
                <CodeSnippet
                  label="deploy script"
                  filename="deploy.sh"
                  code={awsSnippet}
                  onCopy={() => copyText(awsSnippet)}
                />
              </div>
            </div>
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
    </AppShell>
  );
}
