"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { assignableRoles } from "@/lib/roles";
import { api, ApiError, InviteCreated, InviteSummary, ProjectRole } from "@/lib/api";

function PendingAccessRequests({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.orgAccessRequests(orgId),
    queryFn: () => api.listAccessRequests(orgId),
  });
  const requests = requestsQuery.data ?? [];

  const onDecision = async (requestId: string, decision: "approve" | "reject") => {
    setDecidingId(requestId);
    setError(null);
    try {
      if (decision === "approve") {
        await api.approveAccessRequest(orgId, requestId);
      } else {
        await api.rejectAccessRequest(orgId, requestId);
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.orgAccessRequests(orgId) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update request");
    } finally {
      setDecidingId(null);
    }
  };

  if (!requestsQuery.isPending && requests.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
      <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">
          Pending Access Requests
          <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
            {requests.length}
          </span>
        </h3>
      </div>
      <div className="flex flex-col divide-y divide-[#D0D7DE] dark:divide-outline-variant">
        {error && (
          <p className="p-md font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
            {error}
          </p>
        )}
        {requestsQuery.isPending ? (
          <div className="flex justify-center py-lg text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 20 }} />
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-md px-md py-sm">
              <div>
                <p className="font-body-sm text-body-sm text-on-surface">
                  <span className="font-bold">{r.requestedBy.name}</span> wants access to{" "}
                  <span className="font-bold">{r.project.name}</span>
                  {r.requestedRole && (
                    <>
                      {" "}
                      as <span className="font-bold">{r.requestedRole}</span>
                    </>
                  )}
                </p>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  {r.requestedBy.email} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-sm">
                <button
                  type="button"
                  disabled={decidingId === r.id}
                  onClick={() => onDecision(r.id, "approve")}
                  className="rounded-lg bg-primary-container px-sm py-1 font-label-md text-[11px] text-on-primary disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={decidingId === r.id}
                  onClick={() => onDecision(r.id, "reject")}
                  className="rounded-lg border border-outline-variant px-sm py-1 font-label-md text-[11px] text-on-surface disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function inviteStatus(invite: InviteSummary): { label: string; className: string } {
  if (invite.acceptedAt) {
    return {
      label: "Accepted",
      className: "bg-[#1A7F37]/10 text-[#1A7F37] dark:bg-green-500/10 dark:text-green-400",
    };
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return {
      label: "Expired",
      className: "bg-error/10 text-error",
    };
  }
  return {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
}

export function InvitesSection() {
  const { activeOrg: org } = useAuth();

  const [invites, setInvites] = useState<InviteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: queryKeys.orgProjects(org?.id ?? ""),
    queryFn: () => api.listProjects(org!.id),
    enabled: !!org,
  });
  const projects = projectsQuery.data ?? [];
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const isOwner = org?.role === "OWNER";
  const manageableProjects = isOwner
    ? projects
    : projects.filter((p) => p.myRole === "ADMIN");
  const canInvite = manageableProjects.length > 0 || isOwner;
  const roles = isOwner ? assignableRoles("OWNER") : assignableRoles("ADMIN");

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCheck, setEmailCheck] = useState<"idle" | "checking" | "found" | "not-found">("idle");
  const [projectId, setProjectId] = useState("");
  const [role, setRole] = useState<ProjectRole>(roles[0] ?? "VIEWER");
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<InviteCreated | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (roles.length > 0 && !roles.includes(role)) {
      setRole(roles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.role]);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .listInvites(org.id)
      .then((list) => {
        if (!cancelled) {
          setInvites(list);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load invites");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [org]);

  useEffect(() => {
    if (!org || !email.includes("@")) {
      setEmailCheck("idle");
      return;
    }

    setEmailCheck("checking");
    const timer = window.setTimeout(() => {
      api
        .checkEmailExists(org.id, email)
        .then((result) => setEmailCheck(result.exists ? "found" : "not-found"))
        .catch(() => setEmailCheck("idle"));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [org, email]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 3000);
    } catch {
      /* ignore */
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setJustCreated(null);
    setEmail("");
    setProjectId("");
    setEmailCheck("idle");
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    setError(null);

    try {
      const invite = await api.createInvite(org.id, {
        email,
        projectId: projectId || undefined,
        role: projectId ? role : undefined,
      });
      setJustCreated(invite);
      setInvites((prev) => [invite, ...prev]);
      setEmail("");
      setProjectId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  };

  if (!org) {
    return (
      <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
        Create an organization on the Projects page first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-end gap-sm">
        {!canInvite && (
          <span className="font-body-sm text-body-sm text-secondary">
            You need to be an Owner or a project&apos;s Admin to invite people.
          </span>
        )}
        <button
          type="button"
          disabled={!canInvite}
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="flex items-center gap-xs rounded-lg border border-[#e2761d] bg-primary-container px-md py-sm font-label-md text-label-md text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon name="person_add" />
          Invite Member
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && justCreated && (
        <div className="github-card flex flex-col gap-md rounded-lg p-md">
          <h2 className="font-h3 text-h3 text-on-surface">Invite Created</h2>
          {justCreated.token ? (
            <>
              <p className="font-body-sm text-body-sm text-secondary">
                Share this link with <strong>{justCreated.email}</strong> — anyone with it can
                join
                {justCreated.projectId
                  ? ` as ${justCreated.role} on ${projectNameById.get(justCreated.projectId) ?? "the project"}`
                  : " the organization"}
                . It won&apos;t be shown again.
              </p>
              <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-high p-md">
                <span className="truncate pr-md font-code-md text-code-md text-on-surface">
                  {typeof window !== "undefined" ? window.location.origin : ""}/invite/
                  {justCreated.token}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(`${window.location.origin}/invite/${justCreated.token}`)}
                  className="flex-shrink-0 rounded-md bg-primary-container p-sm text-on-primary-container transition-opacity hover:opacity-90"
                >
                  <Icon name="content_copy" />
                </button>
              </div>
            </>
          ) : (
            <p className="font-body-sm text-body-sm text-secondary">
              An invite email was sent to <strong>{justCreated.email}</strong> — the link isn&apos;t
              shown here since it was already delivered.
            </p>
          )}
          <button
            type="button"
            onClick={closeForm}
            className="self-start font-label-md text-label-md text-xs text-primary hover:underline"
          >
            Done
          </button>
        </div>
      )}

      {showForm && !justCreated && (
        <form onSubmit={onInvite} className="github-card flex flex-col gap-md rounded-lg p-md">
          <h2 className="font-h3 text-h3 text-on-surface">Invite Member</h2>
          <p className="font-body-sm text-body-sm text-secondary">
            Anyone with the generated link can join with the selected access — even if they
            already have an EnvSync account, they still need to accept before they&apos;re a
            member.
          </p>
          <label className="block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">
              Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
            />
            {emailCheck === "found" && (
              <span className="mt-xs flex items-center gap-xs font-body-sm text-[11px] text-primary">
                <Icon name="check_circle" style={{ fontSize: 14 }} />
                Account found — they can accept and log in right away
              </span>
            )}
            {emailCheck === "not-found" && (
              <span className="mt-xs flex items-center gap-xs font-body-sm text-[11px] text-on-surface-variant">
                <Icon name="info" style={{ fontSize: 14 }} />
                No EnvSync account yet — they&apos;ll sign in with Google to accept
              </span>
            )}
          </label>
          <div className="flex flex-col gap-md sm:flex-row">
            <Select
              label="Project (optional)"
              wrapperClassName="flex-1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">No project — just join the org</option>
              {manageableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {projectId && (
              <Select
                label="Role on this project"
                wrapperClassName="sm:w-40"
                value={role}
                onChange={(e) => setRole(e.target.value as ProjectRole)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <p className="-mt-xs font-body-sm text-[11px] text-on-surface-variant">
            {projectId
              ? "They'll only have this role on this one project — they can request access to others later."
              : "They'll join the org with no project access yet, and can browse and request access afterward."}
          </p>
          <div className="flex items-center gap-sm">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
            >
              {submitting ? "Please wait..." : "Create Invite Link"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {canInvite && <PendingAccessRequests orgId={org.id} />}

      <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
        <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
          <h3 className="font-label-md text-label-md font-bold text-on-surface">
            Sent Invites
            <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
              {invites.length} Total
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-xl text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 24 }} />
          </div>
        ) : invites.length === 0 ? (
          <p className="px-md py-lg text-center font-body-sm text-body-sm text-secondary">
            No invites sent yet.
          </p>
        ) : (
          <div className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA] dark:hover:bg-surface-container-low"
                >
                  <div>
                    <div className="flex items-center gap-sm">
                      <span className="font-body-md text-body-md font-bold text-on-surface">
                        {invite.email}
                      </span>
                      <span
                        className={`rounded-full px-sm py-[1px] text-[10px] font-bold uppercase ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">
                      {invite.projectId
                        ? `${invite.role} on ${projectNameById.get(invite.projectId) ?? "a project"}`
                        : "Org member (no project)"}
                      {" · "}
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={`copy-toast fixed bottom-lg right-lg z-[100] flex items-center gap-md rounded-xl bg-inverse-surface px-lg py-md text-inverse-on-surface shadow-xl ${
          showToast ? "show" : ""
        }`}
      >
        <Icon name="check_circle" className="text-primary-fixed-dim" />
        <div>
          <p className="font-body-md text-body-md font-bold">Copied to Clipboard</p>
          <p className="font-body-sm text-body-sm opacity-80">Ready to share.</p>
        </div>
      </div>
    </div>
  );
}
