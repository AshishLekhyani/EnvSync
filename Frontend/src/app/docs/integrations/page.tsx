import Link from "next/link";
import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "Integrations — EnvSync Docs" };

const PLATFORMS = [
  {
    name: "GitHub Actions",
    icon: "hub",
    desc: "Pull secrets as a workflow step before build or deploy, authenticated with a service token stored as a repo secret.",
  },
  {
    name: "Docker",
    icon: "deployed_code",
    desc: "Use the CLI as your container entrypoint (envsync run) so secrets are injected at container start, never baked into the image.",
  },
  {
    name: "Vercel",
    icon: "bolt",
    desc: "Wrap your build command in envsync run so EnvSync stays the single source of truth instead of duplicating secrets into Vercel's own store.",
  },
  {
    name: "AWS Secrets Manager",
    icon: "lock",
    desc: "Sync a pulled .env into AWS Secrets Manager as a deploy-pipeline step, for teams standardizing on AWS at runtime.",
  },
];

export default function IntegrationsDocsPage() {
  return (
    <DocsShell>
      <p className="mb-xs font-label-md text-label-md uppercase tracking-wider text-primary">
        Docs
      </p>
      <h1 className="mb-md font-h1 text-h1 text-on-surface">Integrations</h1>
      <p className="mb-xl font-body-lg text-body-lg text-secondary">
        EnvSync doesn&apos;t hold a live connection to any third-party platform — instead it
        generates real, ready-to-paste snippets built entirely on the CLI and service tokens
        you already have.
      </p>

      <div className="mb-xl flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest">
        {PLATFORMS.map((p) => (
          <div key={p.name} className="p-md">
            <p className="mb-xs font-body-md text-body-md font-bold text-on-surface">{p.name}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{p.desc}</p>
          </div>
        ))}
      </div>

      <p className="font-body-md text-body-md text-secondary">
        Generate real snippets with your actual project and environment IDs already filled in
        on the{" "}
        <Link href="/integrations" className="text-primary hover:underline">
          Integrations
        </Link>{" "}
        page (requires an account).
      </p>
    </DocsShell>
  );
}
