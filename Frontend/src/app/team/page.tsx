"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, MemberSummary, OrgRole } from "@/lib/api";

function roleBadgeClass(role: OrgRole) {
  if (role === "OWNER") {
    return "border border-primary/20 bg-primary/10 text-primary";
  }
  return "border border-outline-variant bg-surface-container-highest text-on-surface-variant";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TeamPage() {
  const { organizations } = useAuth();
  const org = organizations[0] ?? null;

  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("DEVELOPER");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .listMembers(org.id)
      .then((list) => {
        if (!cancelled) {
          setMembers(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load team members");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setInviting(true);
    setError(null);

    try {
      const membership = await api.addMember(org.id, {
        email: inviteEmail,
        role: inviteRole,
      });
      setMembers((prev) => [...prev, membership]);
      setInviteEmail("");
      setShowInvite(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to add member. Make sure they already have an EnvSync account."
      );
    } finally {
      setInviting(false);
    }
  };

  return (
    <AppShell searchPlaceholder="Search team...">
      <div className="mx-auto max-w-container-max pb-xl">
        <div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Access Control</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              Manage team members and their environment permissions.
            </p>
          </div>
          {org && (
            <div className="flex gap-sm">
              <button
                type="button"
                disabled
                title="Coming soon"
                className="flex cursor-not-allowed items-center gap-xs rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-[#24292F] opacity-60 shadow-sm dark:border-outline-variant dark:bg-surface-container-high dark:text-on-surface"
              >
                <Icon name="download" />
                Export Audit Log
              </button>
              <button
                type="button"
                onClick={() => setShowInvite((v) => !v)}
                className="flex items-center gap-xs rounded-lg border border-[#e2761d] bg-primary-container px-md py-sm font-label-md text-label-md text-white shadow-sm transition-opacity hover:opacity-90"
              >
                <Icon name="person_add" />
                Invite Member
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </div>
        )}

        {!org && (
          <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
            Create an organization on the Projects page first.
          </div>
        )}

        {org && (
          <>
            {showInvite && (
              <form
                onSubmit={onInvite}
                className="github-card mb-lg flex flex-col gap-md rounded-lg p-md"
              >
                <h2 className="font-h3 text-h3 text-on-surface">Invite Member</h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  They need an existing EnvSync account — invite-by-email for new
                  users is coming in a later phase.
                </p>
                <div className="flex flex-col gap-md sm:flex-row">
                  <label className="block flex-1">
                    <span className="mb-xs block font-label-md text-label-md text-on-surface">
                      Email
                    </span>
                    <input
                      required
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-xs block font-label-md text-label-md text-on-surface">
                      Role
                    </span>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container sm:w-40"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="DEVELOPER">Developer</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-sm">
                  <button
                    type="submit"
                    disabled={inviting}
                    className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                  >
                    {inviting ? "Adding..." : "Add Member"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 items-start gap-lg xl:grid-cols-12">
              <div className="flex flex-col gap-md xl:col-span-7">
                <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
                    <h3 className="font-label-md text-label-md font-bold text-on-surface">
                      Team Members
                      <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
                        {members.length} Total
                      </span>
                    </h3>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-xl text-secondary">
                      <Icon
                        name="progress_activity"
                        className="animate-spin"
                        style={{ fontSize: 24 }}
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                      {members.map((m) => (
                        <div
                          key={m.membershipId}
                          className="flex items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA] dark:hover:bg-surface-container-low"
                        >
                          <div className="flex items-center gap-md">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-outline-variant bg-surface-container-high font-label-md text-label-md text-on-surface-variant">
                              {initials(m.user.name)}
                            </div>
                            <div>
                              <div className="flex items-center gap-sm">
                                <span className="font-body-md text-body-md font-bold text-on-surface">
                                  {m.user.name}
                                </span>
                                <span
                                  className={`rounded-full px-sm py-[1px] text-[10px] font-bold uppercase ${roleBadgeClass(m.role)}`}
                                >
                                  {m.role}
                                </span>
                              </div>
                              <div className="font-body-sm text-body-sm text-on-surface-variant">
                                {m.user.email}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-md rounded-xl border border-primary/20 bg-primary/5 p-md">
                  <Icon name="info" className="text-primary" filled />
                  <div>
                    <h4 className="font-body-md text-body-md font-bold text-on-surface">
                      Role Propagation
                    </h4>
                    <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
                      Roles assigned at the project level will automatically
                      propagate to all microservices and sub-environments unless
                      overridden in the Permission Matrix.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-md xl:col-span-5">
                <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
                  <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
                    <h3 className="font-label-md text-label-md font-bold text-on-surface">
                      Permission Matrix
                    </h3>
                  </div>
                  <div className="custom-scrollbar overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-surface-container-low/50">
                          {["Role", "Dev", "Staging", "Prod"].map((h) => (
                            <th
                              key={h}
                              className="border-b border-[#D0D7DE] dark:border-outline-variant px-md py-sm text-[10px] font-bold uppercase text-on-surface-variant"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                        <tr>
                          <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                            Owner
                          </td>
                          {[0, 1, 2].map((i) => (
                            <td key={i} className="matrix-cell px-md py-md text-center">
                              <Icon name="verified_user" className="text-primary" filled />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                            Admin
                          </td>
                          {[0, 1, 2].map((i) => (
                            <td key={i} className="matrix-cell px-md py-md text-center">
                              <Icon name="check_circle" className="text-primary" filled />
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                            Developer
                          </td>
                          <td className="matrix-cell px-md py-md text-center">
                            <Icon name="check_circle" className="text-primary" filled />
                          </td>
                          <td className="matrix-cell px-md py-md text-center">
                            <Icon name="check_circle" className="text-primary" filled />
                          </td>
                          <td className="matrix-cell px-md py-md text-center">
                            <Icon name="visibility" className="text-on-surface-variant" />
                          </td>
                        </tr>
                        <tr>
                          <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                            Viewer
                          </td>
                          <td className="matrix-cell px-md py-md text-center">
                            <Icon name="visibility" className="text-on-surface-variant" />
                          </td>
                          <td className="matrix-cell px-md py-md text-center">
                            <Icon name="visibility" className="text-on-surface-variant" />
                          </td>
                          <td className="matrix-cell px-md py-md text-center">
                            <Icon name="block" className="text-error" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="border-t border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low p-md">
                    <div className="flex flex-col gap-sm">
                      <div className="flex items-center gap-sm">
                        <Icon
                          name="check_circle"
                          className="text-primary"
                          filled
                          style={{ fontSize: 16 }}
                        />
                        <span className="font-body-sm text-[11px] text-on-surface-variant">
                          Full Read/Write Access
                        </span>
                      </div>
                      <div className="flex items-center gap-sm">
                        <Icon
                          name="visibility"
                          className="text-on-surface-variant"
                          style={{ fontSize: 16 }}
                        />
                        <span className="font-body-sm text-[11px] text-on-surface-variant">
                          Read-only Access
                        </span>
                      </div>
                      <div className="flex items-center gap-sm">
                        <Icon name="block" className="text-error" style={{ fontSize: 16 }} />
                        <span className="font-body-sm text-[11px] text-on-surface-variant">
                          No Access (Hidden)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#CF222E]/30 bg-[#FFEBE9] p-md dark:border-red-500/30 dark:bg-red-500/10">
                  <h4 className="flex items-center gap-sm font-body-md text-body-md font-bold text-[#CF222E] dark:text-red-400">
                    <Icon name="gpp_maybe" />
                    Sensitive Operations
                  </h4>
                  <p className="mt-xs font-body-sm text-body-sm text-[#CF222E]/80 dark:text-red-400/80">
                    Changing &apos;Owner&apos; status requires Multi-Factor
                    Authentication and a 24-hour verification window.
                  </p>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="mt-md cursor-not-allowed rounded-lg border border-[#CF222E] bg-transparent px-md py-sm font-body-sm text-body-sm font-bold text-[#CF222E] opacity-60 dark:border-red-500/50 dark:text-red-400"
                  >
                    Request Role Ownership Change
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
