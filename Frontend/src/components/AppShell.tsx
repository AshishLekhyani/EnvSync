"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";
import { Icon } from "./Icon";

const MOBILE = [
  {
    href: "/projects",
    label: "Projects",
    icon: "folder",
    match: (p: string) =>
      p === "/projects" || p.startsWith("/environment") || p.startsWith("/projects/"),
  },
  { href: "/team", label: "Team", icon: "group", match: (p: string) => p.startsWith("/team") },
  { href: "/audit", label: "Logs", icon: "history", match: (p: string) => p.startsWith("/audit") },
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
  activeEnv = "production",
  trailing,
  mainClassName = "flex-1 p-xl md:ml-64",
  showMobileNav = true,
}: {
  children: React.ReactNode;
  searchPlaceholder?: string;
  showSearch?: boolean;
  activeEnv?: "production" | "staging" | "development";
  trailing?: React.ReactNode;
  mainClassName?: string;
  showMobileNav?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#F6F8FA] font-body-md text-body-md text-on-surface antialiased">
      <TopNav
        searchPlaceholder={searchPlaceholder}
        showSearch={showSearch}
        trailing={trailing}
      />
      <div className="flex min-h-[calc(100vh-64px)]">
        <SideNav activeEnv={activeEnv} />
        <main className={mainClassName}>{children}</main>
      </div>

      {showMobileNav && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-outline-variant bg-surface px-md shadow-lg md:hidden">
          <Link
            href={MOBILE[0].href}
            className={`flex flex-col items-center gap-base ${
              MOBILE[0].match(pathname) ? "text-primary" : "text-secondary"
            }`}
          >
            <Icon name={MOBILE[0].icon} filled={MOBILE[0].match(pathname)} />
            <span className="text-[10px] font-bold uppercase">{MOBILE[0].label}</span>
          </Link>
          <Link
            href={MOBILE[1].href}
            className={`flex flex-col items-center gap-base ${
              MOBILE[1].match(pathname) ? "text-primary" : "text-secondary"
            }`}
          >
            <Icon name={MOBILE[1].icon} filled={MOBILE[1].match(pathname)} />
            <span className="text-[10px] font-bold uppercase">{MOBILE[1].label}</span>
          </Link>
          <div className="relative -top-4">
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-surface bg-primary-container text-on-primary-container shadow-xl"
            >
              <Icon name="add" />
            </button>
          </div>
          <Link
            href={MOBILE[2].href}
            className={`flex flex-col items-center gap-base ${
              MOBILE[2].match(pathname) ? "text-primary" : "text-secondary"
            }`}
          >
            <Icon name={MOBILE[2].icon} filled={MOBILE[2].match(pathname)} />
            <span className="text-[10px] font-bold uppercase">{MOBILE[2].label}</span>
          </Link>
          <Link
            href={MOBILE[3].href}
            className={`flex flex-col items-center gap-base ${
              MOBILE[3].match(pathname) ? "text-primary" : "text-secondary"
            }`}
          >
            <Icon name={MOBILE[3].icon} filled={MOBILE[3].match(pathname)} />
            <span className="text-[10px] font-bold uppercase">{MOBILE[3].label}</span>
          </Link>
        </footer>
      )}
    </div>
  );
}
