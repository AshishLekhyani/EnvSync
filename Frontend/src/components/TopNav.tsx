"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { OrgSwitcher } from "./OrgSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { useOutsideClick } from "@/lib/useOutsideClick";
import { queryKeys } from "@/lib/query-keys";
import { api, ApiError, NotificationSummary } from "@/lib/api";

const NAV = [
  { href: "/projects", label: "Projects", requiresOrg: false },
  { href: "/team", label: "Team", requiresOrg: true },
  { href: "/audit", label: "Audit Logs", requiresOrg: true },
  { href: "/integrations", label: "Integrations", requiresOrg: true },
  { href: "/settings", label: "Settings", requiresOrg: false },
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
  onSearch,
  trailing,
}: {
  searchPlaceholder?: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  trailing?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeOrg, logout } = useAuth();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const notifQuery = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: api.listNotifications,
    enabled: !!user,
  });
  const notifications = notifQuery.data ?? [];
  const notifLoading = notifQuery.isPending;
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  useOutsideClick(notifRef, () => setNotifOpen(false));

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useOutsideClick(profileRef, () => setProfileOpen(false));

  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  useOutsideClick(helpRef, () => setHelpOpen(false));

  const [approvalPending, setApprovalPending] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<Record<string, string>>({});

  useEffect(() => {
    setSearchValue("");
  }, [pathname]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onMarkRead = async (id: string) => {
    await api.markNotificationRead(id);
    queryClient.setQueryData<NotificationSummary[]>(queryKeys.notifications(), (prev) =>
      (prev ?? []).map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const onMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    queryClient.setQueryData<NotificationSummary[]>(queryKeys.notifications(), (prev) =>
      (prev ?? []).map((n) => ({ ...n, read: true }))
    );
  };

  const onDismiss = async (id: string) => {
    await api.dismissNotification(id);
    queryClient.setQueryData<NotificationSummary[]>(queryKeys.notifications(), (prev) =>
      (prev ?? []).filter((n) => n.id !== id)
    );
  };

  const onClearAll = async () => {
    await api.clearAllNotifications();
    queryClient.setQueryData<NotificationSummary[]>(queryKeys.notifications(), []);
  };

  const onApprovalDecision = async (n: NotificationSummary, decision: "approve" | "reject") => {
    const orgId = n.metadata?.orgId as string | undefined;
    if (!orgId) return;

    setApprovalPending(n.id);
    try {
      if (n.type === "invite.approval_requested") {
        const inviteId = n.metadata?.inviteId as string | undefined;
        if (!inviteId) return;
        if (decision === "approve") {
          await api.approveInvite(orgId, inviteId);
        } else {
          await api.rejectInvite(orgId, inviteId);
        }
      } else if (n.type === "project_access.requested") {
        const requestId = n.metadata?.requestId as string | undefined;
        if (!requestId) return;
        if (decision === "approve") {
          await api.approveAccessRequest(orgId, requestId);
        } else {
          await api.rejectAccessRequest(orgId, requestId);
        }
      } else if (n.type === "project_creation.requested") {
        const requestId = n.metadata?.requestId as string | undefined;
        if (!requestId) return;
        if (decision === "approve") {
          await api.approveProjectCreationRequest(orgId, requestId);
        } else {
          await api.rejectProjectCreationRequest(orgId, requestId);
        }
      } else if (n.type === "role_change.requested") {
        const requestId = n.metadata?.requestId as string | undefined;
        if (!requestId) return;
        if (decision === "approve") {
          await api.approveRoleChangeRequest(orgId, requestId);
        } else {
          await api.rejectRoleChangeRequest(orgId, requestId);
        }
      }
      setApprovalResult((prev) => ({ ...prev, [n.id]: decision }));
      await onMarkRead(n.id);
    } catch (err) {
      setApprovalResult((prev) => ({
        ...prev,
        [n.id]: err instanceof ApiError ? `error: ${err.message}` : "error",
      }));
    } finally {
      setApprovalPending(null);
    }
  };

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-xl">
      <div className="flex items-center gap-md">
        <Link
          href="/projects"
          className="font-h2 text-h2 font-black text-primary"
        >
          EnvSync
        </Link>
        <span className="hidden h-6 w-px bg-outline-variant md:block" />
        <OrgSwitcher />
        <nav className="hidden h-full items-center gap-lg pt-2 md:flex">
          {NAV.map((item) => {
            if (item.requiresOrg && !activeOrg) {
              return (
                <span
                  key={item.href}
                  title="Create an organization first"
                  className="cursor-not-allowed pb-2 font-body-md text-body-md text-secondary opacity-40"
                >
                  {item.label}
                </span>
              );
            }
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
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                onSearch?.(e.target.value);
              }}
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
                <div className="flex items-center gap-sm">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="font-body-sm text-body-sm text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="font-body-sm text-body-sm text-secondary hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
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
                  notifications.map((n) => {
                    const isApprovalRequest =
                      n.type === "invite.approval_requested" ||
                      n.type === "project_access.requested" ||
                      n.type === "project_creation.requested" ||
                      n.type === "role_change.requested";
                    const decided = approvalResult[n.id];

                    const dismissButton = (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(n.id);
                        }}
                        aria-label="Dismiss notification"
                        className="absolute right-sm top-sm rounded p-[2px] text-secondary opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                      >
                        <Icon name="close" style={{ fontSize: 14 }} />
                      </button>
                    );

                    if (isApprovalRequest && (!n.read || decided)) {
                      return (
                        <div
                          key={n.id}
                          className={`group relative flex w-full flex-col items-start gap-xs border-b border-outline-variant px-md py-sm pr-lg text-left ${
                            n.read ? "" : "bg-primary/5"
                          }`}
                        >
                          {dismissButton}
                          <span className="font-body-sm text-body-sm text-on-surface">
                            {n.message}
                          </span>
                          <span className="font-body-sm text-[11px] text-secondary">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                          {decided ? (
                            <span className="font-body-sm text-[11px] text-secondary">
                              {decided === "approve"
                                ? "Approved."
                                : decided === "reject"
                                  ? "Rejected."
                                  : "Something went wrong."}
                            </span>
                          ) : (
                            <div className="mt-xs flex gap-sm">
                              <button
                                type="button"
                                disabled={approvalPending === n.id}
                                onClick={() => onApprovalDecision(n, "approve")}
                                className="rounded-lg bg-primary-container px-sm py-1 font-label-md text-[11px] text-on-primary disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={approvalPending === n.id}
                                onClick={() => onApprovalDecision(n, "reject")}
                                className="rounded-lg border border-outline-variant px-sm py-1 font-label-md text-[11px] text-on-surface disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={n.id}
                        className={`group relative border-b border-outline-variant last:border-b-0 ${
                          n.read ? "" : "bg-primary/5"
                        }`}
                      >
                        {dismissButton}
                        <button
                          type="button"
                          onClick={() => onMarkRead(n.id)}
                          className="flex w-full flex-col items-start gap-xs px-md py-sm pr-lg text-left transition-colors hover:bg-surface-container-low"
                        >
                          <span className="font-body-sm text-body-sm text-on-surface">
                            {n.message}
                          </span>
                          <span className="font-body-sm text-[11px] text-secondary">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={helpRef}>
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            className="rounded-lg p-base text-secondary transition-colors hover:bg-surface-container hover:text-primary"
            aria-label="Help"
          >
            <Icon name="help_outline" />
          </button>

          {helpOpen && (
            <div className="absolute right-0 top-full z-50 mt-sm w-56 rounded-xl border border-outline-variant bg-surface shadow-lg">
              <div className="p-xs">
                <Link
                  href="/docs"
                  onClick={() => setHelpOpen(false)}
                  className="flex items-center gap-md rounded-lg px-md py-sm font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="menu_book" style={{ fontSize: 18 }} />
                  Documentation
                </Link>
                <a
                  href="mailto:support@envsync.io"
                  className="flex items-center gap-md rounded-lg px-md py-sm font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="contact_support" style={{ fontSize: 18 }} />
                  Contact Support
                </a>
              </div>
            </div>
          )}
        </div>
        {user && (
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              aria-label="Account menu"
              className="rounded-full transition-opacity hover:opacity-80"
            >
              <Avatar name={user.name} seed={user.email} avatarUrl={user.avatarUrl} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full z-50 mt-sm w-64 rounded-xl border border-outline-variant bg-surface shadow-lg">
                <div className="flex items-center gap-md border-b border-outline-variant p-md">
                  <Avatar name={user.name} seed={user.email} avatarUrl={user.avatarUrl} className="h-10 w-10" />
                  <div className="min-w-0">
                    <div className="truncate font-body-md text-body-md font-bold text-on-surface">
                      {user.name}
                    </div>
                    <div className="truncate font-body-sm text-body-sm text-secondary">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="p-xs">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-md rounded-lg px-md py-sm font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                  >
                    <Icon name="settings" style={{ fontSize: 18 }} />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-md rounded-lg px-md py-sm text-left font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                  >
                    <Icon name="logout" style={{ fontSize: 18 }} />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
