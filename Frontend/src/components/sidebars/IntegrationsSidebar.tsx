"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../Icon";
import { SidebarFooterLinks } from "./SidebarFooterLinks";
import { isActive } from "../SectionNav";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/integrations", label: "Overview", icon: "apps" },
  { href: "/integrations/github-actions", label: "GitHub Actions", icon: "hub" },
  { href: "/integrations/docker", label: "Docker", icon: "deployed_code" },
  { href: "/integrations/vercel", label: "Vercel", icon: "bolt" },
  { href: "/integrations/aws", label: "AWS Secrets Manager", icon: "lock" },
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

function itemIsActive(pathname: string, href: string) {
  return href === "/integrations" ? pathname === href : isActive(pathname, href);
}

export function IntegrationsSidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-md border-r border-outline-variant bg-surface-container-low p-md md:flex">
        <SetupStatus />

        <div className="flex flex-col gap-xs">
          {NAV_ITEMS.map((item) => {
            const active = itemIsActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "flex items-center gap-md rounded-lg bg-primary-container px-md py-sm text-on-primary-container shadow-sm"
                    : "flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
                }
              >
                <Icon name={item.icon} />
                <span className="font-label-md text-label-md">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-xs border-t border-outline-variant pt-md">
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
        {NAV_ITEMS.map((item) => {
          const active = itemIsActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex shrink-0 items-center gap-xs rounded-lg bg-primary-container px-md py-sm text-on-primary-container"
                  : "flex shrink-0 items-center gap-xs rounded-lg px-md py-sm text-on-surface-variant"
              }
            >
              <Icon name={item.icon} style={{ fontSize: 18 }} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
