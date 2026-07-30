"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../Icon";
import { SidebarFooterLinks } from "./SidebarFooterLinks";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api";

const PLATFORMS = [
  { href: "#github-actions", label: "GitHub Actions", icon: "hub" },
  { href: "#docker", label: "Docker", icon: "deployed_code" },
  { href: "#vercel", label: "Vercel", icon: "bolt" },
  { href: "#aws", label: "AWS Secrets Manager", icon: "lock" },
];

function SetupStatus() {
  const { activeOrg: org } = useAuth();
  const isAdmin = org?.role === "OWNER" || org?.role === "ADMIN";

  const tokensQuery = useQuery({
    queryKey: queryKeys.orgTokens(org?.id ?? ""),
    queryFn: () => api.listApiTokens(org!.id),
    enabled: !!org && isAdmin,
  });

  const activeCount = (tokensQuery.data ?? []).filter((t) => !t.revokedAt).length;

  if (!org) return null;

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-high p-md">
      <p className="mb-xs font-body-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
        Setup
      </p>
      {!isAdmin ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Ask an Admin to generate a service token for the CLI.
        </p>
      ) : tokensQuery.isPending ? (
        <div className="flex items-center gap-xs text-secondary">
          <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 16 }} />
        </div>
      ) : (
        <p className="font-body-sm text-body-sm text-on-surface">
          {activeCount === 0
            ? "No service tokens yet."
            : `${activeCount} active service token${activeCount === 1 ? "" : "s"}`}
        </p>
      )}
      <Link
        href="/settings/cli"
        className="mt-xs inline-flex items-center gap-xs font-label-md text-label-md text-primary hover:underline"
      >
        Manage tokens
        <Icon name="arrow_forward" style={{ fontSize: 14 }} />
      </Link>
    </div>
  );
}

export function IntegrationsSidebar() {
  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-md border-r border-outline-variant bg-surface-container-low p-md md:flex">
        <SetupStatus />

        <div className="flex flex-col gap-xs">
          <p className="px-md font-body-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
            Platforms
          </p>
          {PLATFORMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              <Icon name={item.icon} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-xs">
          <Link
            href="/docs/cli"
            className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name="terminal" />
            <span className="font-label-md text-label-md">CLI Reference</span>
          </Link>
          <Link
            href="/docs/integrations"
            className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name="menu_book" />
            <span className="font-label-md text-label-md">Integrations Guide</span>
          </Link>
        </div>

        <div className="mt-auto">
          <SidebarFooterLinks />
        </div>
      </aside>

      <nav className="flex gap-xs overflow-x-auto border-b border-outline-variant bg-surface px-md py-sm md:hidden">
        {PLATFORMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-shrink-0 items-center gap-xs rounded-lg px-md py-sm text-on-surface-variant"
          >
            <Icon name={item.icon} style={{ fontSize: 18 }} />
            <span className="font-label-md text-label-md">{item.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
