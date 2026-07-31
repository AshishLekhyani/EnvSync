"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { queryKeys } from "@/lib/query-keys";
import { assignableRoles } from "@/lib/roles";
import { api, ApiError, InviteCreated, InviteSummary, MemberSummary, OrgRole } from "@/lib/api";

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

function AutoApproveSettings({ orgId }: { orgId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: queryKeys.orgMembers(orgId),
    queryFn: () => api.listMembers(orgId),
  });
  const rulesQuery = useQuery({
    queryKey: queryKeys.orgAutoApproveRules(orgId),
    queryFn: () => api.listAutoApproveRules(orgId),
  });

  const developers = (membersQuery.data ?? []).filter(
    (m: MemberSummary) => m.role === "DEVELOPER"
  );
  const rules = rulesQuery.data ?? [];
  const blanketRule = rules.find((r) => r.inviter === null);
  const perInviterIds = new Set(rules.filter((r) => r.inviter !== null).map((r) => r.inviter!.id));

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.orgAutoApproveRules(orgId) });

  const toggleBlanket = async () => {
    setPendingId("blanket");
    setError(null);
    try {
      await api.setBlanketAutoApprove(orgId, !blanketRule);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setPendingId(null);
    }
  };

  const toggleInviter = async (userId: string, enabled: boolean) => {
    setPendingId(userId);
    setError(null);
    try {
      if (enabled) {
        await api.disableInviterAutoApprove(orgId, userId);
      } else {
        await api.enableInviterAutoApprove(orgId, userId);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setPendingId(null);
    }
  };

  if (developers.length === 0 && !blanketRule) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
      <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
        <h3 className="font-label-md text-label-md font-bold text-on-surface">
          Auto-Approve Settings
        </h3>
        <p className="mt-xs font-body-sm text-[11px] text-on-surface-variant">
          Developer-issued invites normally need an Admin or Owner to approve them. Turn
          this on to skip that step for everyone, or for specific people.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-[#D0D7DE] dark:divide-outline-variant p-md">
        {error && (
          <p className="pb-sm font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
            {error}
          </p>
        )}
        <label className="flex items-center justify-between gap-md py-sm">
          <span className="font-body-sm text-body-sm text-on-surface">
            Auto-approve all Developer invites org-wide
          </span>
          <input
            type="checkbox"
            checked={!!blanketRule}
            disabled={pendingId === "blanket"}
            onChange={toggleBlanket}
            className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
          />
        </label>
        {developers.map((m) => {
          const enabled = perInviterIds.has(m.user.id);
          return (
            <label key={m.membershipId} className="flex items-center justify-between gap-md py-sm">
              <span className="font-body-sm text-body-sm text-on-surface">
                {m.user.name} <span className="text-on-surface-variant">({m.user.email})</span>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={pendingId === m.user.id || !!blanketRule}
                onChange={() => toggleInviter(m.user.id, enabled)}
                className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
              />
            </label>
          );
        })}
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
  if (invite.approvalStatus === "REJECTED") {
    return {
      label: "Rejected",
      className: "bg-error/10 text-error",
    };
  }
  if (invite.approvalStatus === "PENDING") {
    return {
      label: "Awaiting Approval",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
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

  const roles = org ? assignableRoles(org.role) : [];
  const canInvite = roles.length > 0;
  const canManageApprovals = org?.role === "OWNER" || org?.role === "ADMIN";
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [directAddMode, setDirectAddMode] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCheck, setEmailCheck] = useState<"idle" | "checking" | "found" | "not-found">("idle");
  const [role, setRole] = useState<OrgRole>("VIEWER");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<InviteCreated | null>(null);
  const [justApproved, setJustApproved] = useState<InviteCreated | null>(null);
  const [directAddSuccess, setDirectAddSuccess] = useState<string | null>(null);
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
    if (!org || !directAddMode || !email.includes("@")) {
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
  }, [org, directAddMode, email]);

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
    setDirectAddMode(false);
    setJustCreated(null);
    setDirectAddSuccess(null);
    setEmail("");
    setProjectId("");
    setEmailCheck("idle");
  };

  const onDecision = async (inviteId: string, decision: "approve" | "reject") => {
    if (!org) return;
    setDecidingId(inviteId);
    setError(null);
    try {
      if (decision === "approve") {
        const updated = await api.approveInvite(org.id, inviteId);
        setInvites((prev) => prev.map((i) => (i.id === inviteId ? updated : i)));
        setJustApproved(updated);
      } else {
        const updated = await api.rejectInvite(org.id, inviteId);
        setInvites((prev) => prev.map((i) => (i.id === inviteId ? updated : i)));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update invite");
    } finally {
      setDecidingId(null);
    }
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    setError(null);

    try {
      const invite = await api.createInvite(org.id, {
        email,
        role,
        projectId: projectId || undefined,
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

  const onDirectAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    setError(null);

    try {
      const membership = await api.addMember(org.id, {
        email,
        role,
        projectId: projectId || undefined,
      });
      setDirectAddSuccess(`${membership.user.name} was added directly and can log in now.`);
      setEmail("");
      setProjectId("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to add member. Make sure they already have an EnvSync account."
      );
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
            Viewers can&apos;t invite anyone.
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
          <p className="font-body-sm text-body-sm text-secondary">
            Share this link with <strong>{justCreated.email}</strong> — anyone with it can
            join as <strong>{justCreated.role}</strong>
            {justCreated.projectId
              ? ` with access to ${projectNameById.get(justCreated.projectId) ?? "one project"}`
              : ", with no project access until one is granted"}
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
          <button
            type="button"
            onClick={closeForm}
            className="self-start font-label-md text-label-md text-xs text-primary hover:underline"
          >
            Done
          </button>
        </div>
      )}

      {showForm && directAddSuccess && (
        <div className="github-card flex flex-col gap-md rounded-lg p-md">
          <h2 className="font-h3 text-h3 text-on-surface">Member Added</h2>
          <p className="font-body-sm text-body-sm text-secondary">{directAddSuccess}</p>
          <button
            type="button"
            onClick={closeForm}
            className="self-start font-label-md text-label-md text-xs text-primary hover:underline"
          >
            Done
          </button>
        </div>
      )}

      {showForm && !justCreated && !directAddSuccess && (
        <form
          onSubmit={directAddMode ? onDirectAdd : onInvite}
          className="github-card flex flex-col gap-md rounded-lg p-md"
        >
          <h2 className="font-h3 text-h3 text-on-surface">
            {directAddMode ? "Add Existing Member" : "Invite Member"}
          </h2>
          <p className="font-body-sm text-body-sm text-secondary">
            {directAddMode
              ? "They need an existing EnvSync account."
              : "Anyone with the generated link can join with the selected role."}
          </p>
          {org.role === "DEVELOPER" && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-md py-sm font-body-sm text-body-sm text-amber-700 dark:text-amber-400">
              As a Developer, you can only invite Viewers, and it needs an Admin or Owner to
              approve before the link works — unless they&apos;ve set up auto-approval for you.
            </p>
          )}
          <div className="flex flex-col gap-md sm:flex-row">
            <label className="block flex-1">
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
              {directAddMode && emailCheck === "checking" && (
                <span className="mt-xs flex items-center gap-xs font-body-sm text-[11px] text-on-surface-variant">
                  <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 12 }} />
                  Checking...
                </span>
              )}
              {directAddMode && emailCheck === "found" && (
                <span className="mt-xs flex items-center gap-xs font-body-sm text-[11px] text-primary">
                  <Icon name="check_circle" style={{ fontSize: 14 }} />
                  Account found
                </span>
              )}
              {directAddMode && emailCheck === "not-found" && (
                <span className="mt-xs flex items-center gap-xs font-body-sm text-[11px] text-[#CF222E] dark:text-red-400">
                  <Icon name="cancel" style={{ fontSize: 14 }} />
                  No EnvSync account with this email yet
                </span>
              )}
            </label>
            <Select
              label="Role"
              wrapperClassName="sm:w-40"
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <Select
            label="Project access"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No specific project (org-wide only)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <p className="-mt-xs font-body-sm text-[11px] text-on-surface-variant">
            {directAddMode
              ? "Optionally grant immediate access to one project. They'll only see this project unless given access to more later."
              : "Optionally grant immediate access to one project when they accept. They'll only see this project unless given access to more later."}
          </p>
          <div className="flex items-center gap-sm">
            <button
              type="submit"
              disabled={submitting || (directAddMode && emailCheck === "not-found")}
              className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
            >
              {submitting
                ? "Please wait..."
                : directAddMode
                  ? "Add Member"
                  : "Create Invite Link"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setDirectAddMode((v) => !v)}
              className="font-body-sm text-body-sm text-primary hover:underline"
            >
              {directAddMode
                ? "Invite by link instead"
                : "Already have an account? Add them directly instead"}
            </button>
          </div>
        </form>
      )}

      {justApproved && (
        <div className="github-card flex flex-col gap-md rounded-lg p-md">
          <h2 className="font-h3 text-h3 text-on-surface">Invite Approved</h2>
          <p className="font-body-sm text-body-sm text-secondary">
            {justApproved.email} was emailed a link if email is configured. Here it is too, in
            case you want to share it directly — it won&apos;t be shown again.
          </p>
          <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-high p-md">
            <span className="truncate pr-md font-code-md text-code-md text-on-surface">
              {typeof window !== "undefined" ? window.location.origin : ""}/invite/
              {justApproved.token}
            </span>
            <button
              type="button"
              onClick={() => copyText(`${window.location.origin}/invite/${justApproved.token}`)}
              className="flex-shrink-0 rounded-md bg-primary-container p-sm text-on-primary-container transition-opacity hover:opacity-90"
            >
              <Icon name="content_copy" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setJustApproved(null)}
            className="self-start font-label-md text-label-md text-xs text-primary hover:underline"
          >
            Done
          </button>
        </div>
      )}

      {canManageApprovals && <PendingAccessRequests orgId={org.id} />}

      {canManageApprovals && <AutoApproveSettings orgId={org.id} />}

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
                      Invited as {invite.role}
                      {invite.projectId &&
                        ` · ${projectNameById.get(invite.projectId) ?? "a project"}`}
                      {" · "}
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {canManageApprovals && invite.approvalStatus === "PENDING" && (
                    <div className="flex flex-shrink-0 gap-sm">
                      <button
                        type="button"
                        disabled={decidingId === invite.id}
                        onClick={() => onDecision(invite.id, "approve")}
                        className="rounded-lg bg-primary-container px-sm py-1 font-label-md text-[11px] text-on-primary disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={decidingId === invite.id}
                        onClick={() => onDecision(invite.id, "reject")}
                        className="rounded-lg border border-outline-variant px-sm py-1 font-label-md text-[11px] text-on-surface disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
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
