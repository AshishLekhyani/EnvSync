"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { ProjectsSidebar } from "./sidebars/ProjectsSidebar";
import { TeamSidebar } from "./sidebars/TeamSidebar";
import { SettingsSidebar } from "./sidebars/SettingsSidebar";
import { AuditSidebar } from "./sidebars/AuditSidebar";
import { IntegrationsSidebar } from "./sidebars/IntegrationsSidebar";
import { TopNav } from "./TopNav";
import { Icon } from "./Icon";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { useAuth } from "@/lib/auth-context";

function MobileNavItem({
  item,
  pathname,
  locked,
}: {
  item: (typeof MOBILE)[number];
  pathname: string;
  locked: boolean;
}) {
  if (locked) {
    return (
      <span
        title="Create an organization first"
        className="flex cursor-not-allowed flex-col items-center gap-base text-secondary opacity-40"
      >
        <Icon name={item.icon} />
        <span className="text-[10px] font-bold uppercase">{item.label}</span>
      </span>
    );
  }
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-base ${
        item.match(pathname) ? "text-primary" : "text-secondary"
      }`}
    >
      <Icon name={item.icon} filled={item.match(pathname)} />
      <span className="text-[10px] font-bold uppercase">{item.label}</span>
    </Link>
  );
}

function SectionSidebar({ pathname }: { pathname: string }) {
  if (pathname === "/projects" || pathname.startsWith("/projects/")) {
    return <ProjectsSidebar />;
  }
  if (pathname.startsWith("/team")) {
    return <TeamSidebar />;
  }
  if (pathname.startsWith("/audit")) {
    return <AuditSidebar />;
  }
  if (pathname.startsWith("/integrations")) {
    return <IntegrationsSidebar />;
  }
  if (pathname.startsWith("/settings")) {
    return <SettingsSidebar />;
  }
  return null;
}

const MOBILE = [
  {
    href: "/projects",
    label: "Projects",
    icon: "folder",
    match: (p: string) => p === "/projects" || p.startsWith("/projects/"),
    requiresOrg: false,
  },
  {
    href: "/team",
    label: "Team",
    icon: "group",
    match: (p: string) => p.startsWith("/team"),
    requiresOrg: true,
  },
  {
    href: "/audit",
    label: "Logs",
    icon: "history",
    match: (p: string) => p.startsWith("/audit"),
    requiresOrg: true,
  },
  {
    href: "/integrations",
    label: "Integrations",
    icon: "hub",
    match: (p: string) => p.startsWith("/integrations"),
    requiresOrg: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    match: (p: string) => p.startsWith("/settings"),
    requiresOrg: false,
  },
] as const;

export function AppShell({
  children,
  searchPlaceholder,
  showSearch = true,
  onSearch,
  trailing,
  mainClassName = "flex-1 p-xl",
  showMobileNav = true,
}: {
  children: React.ReactNode;
  searchPlaceholder?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  trailing?: React.ReactNode;
  mainClassName?: string;
  showMobileNav?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeOrg, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] dark:bg-background">
        <Icon name="progress_activity" className="animate-spin text-primary" style={{ fontSize: 32 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <VerifyEmailBanner />
      <TopNav
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        onSearch={onSearch}
        trailing={trailing}
      />
      <Suspense fallback={null}>
        <SectionSidebar pathname={pathname} />
      </Suspense>
      <div className="min-h-[calc(100vh-64px)]">
        <main className={`${mainClassName} md:ml-64`}>{children}</main>
      </div>

      {showMobileNav && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant bg-surface px-md shadow-lg md:hidden">
          {MOBILE.slice(0, 2).map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              locked={item.requiresOrg && !activeOrg}
            />
          ))}
          <div className="relative -top-4">
            <button
              type="button"
              aria-label="Create"
              onClick={() => router.push("/projects?create=1")}
              className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-surface bg-primary-container text-on-primary-container shadow-xl"
            >
              <Icon name="add" />
            </button>
          </div>
          {MOBILE.slice(2).map((item) => (
            <MobileNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              locked={item.requiresOrg && !activeOrg}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
