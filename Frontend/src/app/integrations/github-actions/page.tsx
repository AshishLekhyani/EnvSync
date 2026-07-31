"use client";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { IntegrationSnippet } from "@/components/IntegrationSnippet";

export default function GithubActionsIntegrationPage() {
  return (
    <AppShell showSearch={false} mainClassName="mx-auto w-full max-w-container-max flex-1 p-md lg:p-xl">
      <div className="mb-lg flex items-center gap-md">
        <Icon name="hub" className="text-primary" style={{ fontSize: 32 }} />
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">GitHub Actions</h1>
          <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
            Pull secrets as a workflow step before your build or deploy job runs.
          </p>
        </div>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Prerequisites</h2>
        <ul className="list-disc space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>A service token, generated from Settings → CLI &amp; Tokens.</li>
          <li>
            That token stored as a repository secret named{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">ENVSYNC_TOKEN</code>.
          </li>
        </ul>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Setup</h2>
        <ol className="list-decimal space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>Add the step below to your workflow, before the job step that needs the secrets.</li>
          <li>
            The CLI reads the token straight from the{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">ENVSYNC_TOKEN</code>{" "}
            environment variable — no separate login step needed in CI.
          </li>
          <li>
            Downstream steps in the same job can read the pulled{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">.env</code> file.
          </li>
        </ol>
      </div>

      <IntegrationSnippet
        filename=".github/workflows/deploy.yml"
        buildCode={(projectId, environmentId) => `- name: Pull secrets from EnvSync
  run: npx @ashishlekhyani/envsync-cli pull --project ${projectId} --environment ${environmentId}
  env:
    ENVSYNC_TOKEN: \${{ secrets.ENVSYNC_TOKEN }}`}
      />

      <p className="mt-lg font-body-sm text-body-sm text-on-surface-variant">
        EnvSync doesn&apos;t hold a live connection to GitHub — this generates a real, working
        step you paste into your own workflow.
      </p>
    </AppShell>
  );
}
