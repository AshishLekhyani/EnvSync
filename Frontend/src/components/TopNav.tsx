"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AVATAR_SRC, Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { api, NotificationSummary } from "@/lib/api";

const NAV = [
  { href: "/projects", label: "Projects" },
  { href: "/team", label: "Team" },
  { href: "/audit", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
] as const;

function navActive(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/");
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
  const router = useRouter();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listNotifications().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    if (!notifOpen) return;
    setNotifLoading(true);
    api
      .listNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setNotifLoading(false));
  }, [notifOpen]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const onMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

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
        <ThemeToggle />
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            className="relative rounded-lg p-base text-secondary transition-colors hover:bg-surface-container hover:text-primary"
            aria-label="Notifications"
          >
            <Icon name="notifications" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-sm w-80 rounded-xl border border-outline-variant bg-surface shadow-lg">
              <div className="flex items-center justify-between border-b border-outline-variant px-md py-sm">
                <span className="font-label-md text-label-md font-bold text-on-surface">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="font-body-sm text-body-sm text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifLoading ? (
                  <div className="flex justify-center py-lg text-secondary">
                    <Icon
                      name="progress_activity"
                      className="animate-spin"
                      style={{ fontSize: 20 }}
                    />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="px-md py-lg text-center font-body-sm text-body-sm text-secondary">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => onMarkRead(n.id)}
                      className={`flex w-full flex-col items-start gap-xs border-b border-outline-variant px-md py-sm text-left transition-colors last:border-b-0 hover:bg-surface-container-low ${
                        n.read ? "" : "bg-primary/5"
                      }`}
                    >
                      <span className="font-body-sm text-body-sm text-on-surface">
                        {n.message}
                      </span>
                      <span className="font-body-sm text-[11px] text-secondary">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-base text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          aria-label="Help"
        >
          <Icon name="help_outline" />
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg p-base text-secondary transition-colors hover:bg-surface-container hover:text-primary"
          aria-label="Log out"
          title={user ? `Log out (${user.email})` : "Log out"}
        >
          <Icon name="logout" />
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
