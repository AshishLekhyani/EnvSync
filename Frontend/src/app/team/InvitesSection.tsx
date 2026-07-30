"use client";

import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Select } from "@/components/Select";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, InviteCreated, InviteSummary, OrgRole } from "@/lib/api";

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

  const [showForm, setShowForm] = useState(false);
  const [directAddMode, setDirectAddMode] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("DEVELOPER");
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<InviteCreated | null>(null);
  const [directAddSuccess, setDirectAddSuccess] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

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
  };

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSubmitting(true);
    setError(null);

    try {
      const invite = await api.createInvite(org.id, { email, role });
      setJustCreated(invite);
      setInvites((prev) => [invite, ...prev]);
      setEmail("");
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
      const membership = await api.addMember(org.id, { email, role });
      setDirectAddSuccess(`${membership.user.name} was added directly and can log in now.`);
      setEmail("");
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="flex items-center gap-xs rounded-lg border border-[#e2761d] bg-primary-container px-md py-sm font-label-md text-label-md text-white shadow-sm transition-opacity hover:opacity-90"
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
            join as <strong>{justCreated.role}</strong>. It won&apos;t be shown again.
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
            </label>
            <Select
              label="Role"
              wrapperClassName="sm:w-40"
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
            >
              <option value="ADMIN">Admin</option>
              <option value="DEVELOPER">Developer</option>
              <option value="VIEWER">Viewer</option>
            </Select>
          </div>
          <div className="flex items-center gap-sm">
            <button
              type="submit"
              disabled={submitting}
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
                      Invited as {invite.role} · {new Date(invite.createdAt).toLocaleDateString()}
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
