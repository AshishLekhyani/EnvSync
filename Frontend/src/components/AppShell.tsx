"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";
import { Icon } from "./Icon";
import { useAuth } from "@/lib/auth-context";

const MOBILE = [
  {
    href: "/projects",
    label: "Projects",
    icon: "folder",
    match: (p: string) => p === "/projects" || p.startsWith("/projects/"),
  },
  { href: "/team", label: "Team", icon: "group", match: (p: string) => p.startsWith("/team") },
  { href: "/audit", label: "Logs", icon: "history", match: (p: string) => p.startsWith("/audit") },
  {
    href: "/integrations",
    label: "Integrations",
    icon: "hub",
    match: (p: string) => p.startsWith("/integrations"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    match: (p: string) => p.startsWith("/settings"),
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
  const params = useParams<{ projectId?: string }>();
  const { user, loading } = useAuth();
  const showSideNav = !!params.projectId;

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
      <TopNav
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        onSearch={onSearch}
        trailing={trailing}
      />
      <div className="flex min-h-[calc(100vh-64px)]">
        {showSideNav && <SideNav projectId={params.projectId!} />}
        <main className={`${mainClassName} ${showSideNav ? "md:ml-64" : ""}`}>
          {children}
        </main>
      </div>

      {showMobileNav && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant bg-surface px-md shadow-lg md:hidden">
          {MOBILE.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-base ${
                item.match(pathname) ? "text-primary" : "text-secondary"
              }`}
            >
              <Icon name={item.icon} filled={item.match(pathname)} />
              <span className="text-[10px] font-bold uppercase">{item.label}</span>
            </Link>
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
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-base ${
                item.match(pathname) ? "text-primary" : "text-secondary"
              }`}
            >
              <Icon name={item.icon} filled={item.match(pathname)} />
              <span className="text-[10px] font-bold uppercase">{item.label}</span>
            </Link>
          ))}
        </footer>
      )}
    </div>
  );
}
