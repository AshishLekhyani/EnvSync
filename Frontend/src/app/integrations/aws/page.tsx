"use client";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { IntegrationSnippet } from "@/components/IntegrationSnippet";

export default function AwsIntegrationPage() {
  return (
    <AppShell showSearch={false} mainClassName="mx-auto w-full md:w-[calc(100%-16rem)] max-w-container-max flex-1 p-md lg:p-xl">
      <div className="mb-lg flex items-center gap-md">
        <Icon name="lock" className="text-primary" style={{ fontSize: 32 }} />
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">AWS Secrets Manager</h1>
          <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
            Sync EnvSync into AWS as a deploy-pipeline step, for teams standardizing on AWS
            at runtime.
          </p>
        </div>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Prerequisites</h2>
        <ul className="list-disc space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>A service token, generated from Settings → CLI &amp; Tokens.</li>
          <li>AWS CLI installed and configured with permission to write to the target secret.</li>
        </ul>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Setup</h2>
        <ol className="list-decimal space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>
            Export <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">ENVSYNC_TOKEN</code> in
            your deploy pipeline&apos;s environment.
          </li>
          <li>Run the script below as a deploy step — it pulls, then pushes the result into AWS.</li>
        </ol>
      </div>

      <IntegrationSnippet
        filename="deploy.sh"
        buildCode={(projectId, environmentId) => `npx @ashishlekhyani/envsync-cli pull --project ${projectId} --environment ${environmentId} --out .env
aws secretsmanager put-secret-value \\
  --secret-id my-app/${environmentId} \\
  --secret-string file://.env`}
      />

      <p className="mt-lg font-body-sm text-body-sm text-on-surface-variant">
        EnvSync doesn&apos;t hold a live connection to AWS — this generates a real, working
        script you paste into your own deploy pipeline.
      </p>
    </AppShell>
  );
}
