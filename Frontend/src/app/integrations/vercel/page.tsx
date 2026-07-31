"use client";

import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { IntegrationSnippet } from "@/components/IntegrationSnippet";

export default function VercelIntegrationPage() {
  return (
    <AppShell showSearch={false} mainClassName="mx-auto w-full max-w-container-max flex-1 p-md lg:p-xl">
      <div className="mb-lg flex items-center gap-md">
        <Icon name="bolt" className="text-primary" style={{ fontSize: 32 }} />
        <div>
          <h1 className="font-h1 text-h1 text-on-surface">Vercel</h1>
          <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
            Wrap your build command so EnvSync stays the single source of truth instead of
            duplicating secrets into Vercel&apos;s own store.
          </p>
        </div>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Prerequisites</h2>
        <ul className="list-disc space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>A service token, generated from Settings → CLI &amp; Tokens.</li>
          <li>
            The token added as a Vercel project environment variable named{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">ENVSYNC_TOKEN</code>.
          </li>
        </ul>
      </div>

      <div className="mb-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Setup</h2>
        <ol className="list-decimal space-y-xs pl-lg font-body-sm text-body-sm text-on-surface-variant">
          <li>Update your <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">package.json</code> build script as shown below — <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">npx</code> fetches the CLI on demand, no extra install step needed.</li>
          <li>Vercel&apos;s build environment already exposes your project env vars to the build command, so no extra config is needed.</li>
        </ol>
      </div>

      <IntegrationSnippet
        filename="package.json"
        buildCode={(projectId, environmentId) => `{
  "scripts": {
    "build": "npx @ashishlekhyani/envsync-cli run --project ${projectId} --environment ${environmentId} -- next build"
  }
}`}
      />

      <p className="mt-lg font-body-sm text-body-sm text-on-surface-variant">
        EnvSync doesn&apos;t hold a live connection to Vercel — this generates a real,
        working build script you paste into your own package.json.
      </p>
    </AppShell>
  );
}
