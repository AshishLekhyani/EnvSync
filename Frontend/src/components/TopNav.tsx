"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AVATAR_SRC, Icon } from "./Icon";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/team", label: "Team" },
  { href: "/audit", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/projects") {
    return (
      pathname === "/projects" ||
      pathname.startsWith("/environment") ||
      pathname.startsWith("/projects/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav({
  searchPlaceholder = "Search projects...",
  showSearch = true,
  trailing,
}: {
  searchPlaceholder?: string;
  showSearch?: boolean;
  trailing?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-xl">
      <div className="flex items-center gap-xl">
        <Link
          href="/projects"
          className="font-h2 text-h2 font-black text-primary"
        >
          EnvSync
        </Link>
        <nav className="hidden h-full items-center gap-lg pt-2 md:flex">
          {NAV.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "border-b-2 border-primary pb-2 font-body-md text-body-md text-primary"
                    : "pb-2 font-body-md text-body-md text-secondary transition-colors hover:text-primary"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-md">
        {showSearch && (
          <div className="relative hidden sm:block">
            <Icon
              name="search"
              className="pointer-events-none absolute left-sm top-1/2 -translate-y-1/2 text-secondary"
              style={{ fontSize: 18 }}
            />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-64 rounded-lg border border-outline-variant bg-surface-container-low py-xs pl-xl pr-md font-body-sm text-body-sm text-on-surface outline-none transition-all placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary-container"
            />
          </div>
        )}
        {trailing}
        <button
          type="button"
          className="relative rounded-lg p-base text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          aria-label="Notifications"
        >
          <Icon name="notifications" />
        </button>
        <button
          type="button"
          className="rounded-lg p-base text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          aria-label="Help"
        >
          <Icon name="help_outline" />
        </button>
        <img
          src={AVATAR_SRC}
          alt="User avatar"
          className="h-8 w-8 rounded-full border border-outline-variant object-cover"
        />
      </div>
    </header>
  );
}
