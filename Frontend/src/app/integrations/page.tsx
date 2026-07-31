"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";

const PLATFORMS = [
  {
    href: "/integrations/github-actions",
    icon: "hub",
    name: "GitHub Actions",
    desc: "Pull secrets as a workflow step before build or deploy.",
  },
  {
    href: "/integrations/docker",
    icon: "deployed_code",
    name: "Docker",
    desc: "Use the CLI as your container entrypoint to inject secrets at runtime.",
  },
  {
    href: "/integrations/vercel",
    icon: "bolt",
    name: "Vercel",
    desc: "Wrap your build command so EnvSync is the source of truth at build time.",
  },
  {
    href: "/integrations/aws",
    icon: "lock",
    name: "AWS Secrets Manager",
    desc: "Sync EnvSync into AWS as part of your deploy pipeline.",
  },
];

export default function IntegrationsPage() {
  const { activeOrg: org } = useAuth();

  return (
    <AppShell showSearch={false} mainClassName="mx-auto w-full max-w-container-max flex-1 p-md lg:p-xl">
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface">Integrations</h1>
        <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
          Ready-to-use snippets for pulling EnvSync secrets into your existing pipelines.
          Generate a service token on the{" "}
          <Link href="/settings/cli" className="text-primary hover:underline">
            Settings
          </Link>{" "}
          page first.
        </p>
      </div>

      {!org && (
        <div className="github-card mb-lg rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
          Create an organization on the Projects page first.
        </div>
      )}

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2">
        {PLATFORMS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-[0_1px_0_rgba(27,31,35,0.04)] transition-colors hover:border-primary"
          >
            <div className="flex items-center gap-sm">
              <Icon name={p.icon} className="text-primary" style={{ fontSize: 28 }} />
              <h2 className="font-h3 text-h3 text-on-surface">{p.name}</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{p.desc}</p>
            <span className="mt-xs flex items-center gap-xs font-label-md text-label-md text-primary">
              View setup guide
              <Icon
                name="arrow_forward"
                style={{ fontSize: 16 }}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
