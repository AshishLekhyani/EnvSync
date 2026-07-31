"use client";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { IntegrationSnippet } from "@/components/IntegrationSnippet";

export default function DockerIntegrationPage() {
  return (
    <AppShell showSearch={false} mainClassName="mx-auto w-full max-w-container-max flex-1 p-md lg:p-xl">
      <div className="mb-lg flex items-center gap-md">
        <Icon name="deployed_code" className="text-primary" style={{ fontSize: 32 }} />
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">Docker</h1>
          <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
            Use the CLI as your container entrypoint so secrets are injected at container
            start, never baked into the image.
          </p>
        </div>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Prerequisites</h2>
        <ul className="list-disc space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>A service token, generated from Settings → CLI &amp; Tokens.</li>
          <li>Never pass the token as a build argument — it would be cached in the image layer.</li>
        </ul>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Setup</h2>
        <ol className="list-decimal space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>Install the CLI and set the entrypoint as shown below.</li>
          <li>
            Pass the token at run time only:{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">
              docker run -e ENVSYNC_TOKEN=... your-image
            </code>
            .
          </li>
        </ol>
      </div>

      <IntegrationSnippet
        filename="Dockerfile"
        buildCode={(projectId, environmentId) => `FROM node:20-slim
RUN npm install -g envsync-cli
COPY . .
ENTRYPOINT ["envsync", "run", "--project", "${projectId}", "--environment", "${environmentId}", "--", "node", "server.js"]`}
      />

      <p className="mt-lg font-body-sm text-body-sm text-on-surface-variant">
        EnvSync doesn&apos;t hold a live connection to Docker — this generates a real,
        working entrypoint you paste into your own Dockerfile.
      </p>
    </AppShell>
  );
}
