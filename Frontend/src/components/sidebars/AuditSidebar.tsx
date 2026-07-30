"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../Icon";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { api } from "@/lib/api";
import { SidebarFooterLinks } from "./SidebarFooterLinks";

export function AuditSidebar() {
  const { activeOrg: org } = useAuth();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("projectId");

  const projectsQuery = useQuery({
    queryKey: queryKeys.orgProjects(org?.id ?? ""),
    queryFn: () => api.listProjects(org!.id),
    enabled: !!org,
  });
  const projects = projectsQuery.data ?? [];

  const itemClass = (active: boolean) =>
    active
      ? "flex items-center gap-md rounded-lg bg-primary-container px-md py-sm text-on-primary-container shadow-sm"
      : "flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high";

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-xs border-r border-outline-variant bg-surface-container-low p-md md:flex">
        <Link href="/audit" className={itemClass(!activeProjectId)}>
          <Icon name="history" />
          <span className="font-label-md text-label-md">All Activity</span>
        </Link>
        {projects.length > 0 && (
          <>
            <p className="mt-md px-md font-body-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
              By project
            </p>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/audit?projectId=${p.id}`}
                className={itemClass(activeProjectId === p.id)}
              >
                <Icon name="folder" style={{ fontSize: 18 }} />
                <span className="truncate font-label-md text-label-md">{p.name}</span>
              </Link>
            ))}
          </>
        )}
        <SidebarFooterLinks />
      </aside>

      <nav className="flex gap-xs overflow-x-auto border-b border-outline-variant bg-surface px-md py-sm md:hidden">
        <Link href="/audit" className={itemClass(!activeProjectId) + " flex-shrink-0"}>
          <Icon name="history" style={{ fontSize: 18 }} />
          <span className="font-label-md text-label-md">All</span>
        </Link>
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/audit?projectId=${p.id}`}
            className={itemClass(activeProjectId === p.id) + " flex-shrink-0"}
          >
            <span className="truncate font-label-md text-label-md">{p.name}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
