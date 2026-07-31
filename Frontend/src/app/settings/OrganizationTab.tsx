"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm-context";
import { useLeaveOrganization } from "@/lib/useLeaveOrganization";
import { api, ApiError, MemberSummary } from "@/lib/api";
import { downloadJson } from "@/lib/csv";

function ProjectVisibilitySection({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .listMembers(orgId)
      .then((list) => {
        if (!cancelled) {
          setMembers(list.filter((m) => m.role !== "OWNER"));
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load members");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const toggle = async (member: MemberSummary) => {
    setPendingId(member.membershipId);
    setError(null);
    try {
      const next = !member.canViewAllProjects;
      await api.setCanViewAllProjects(orgId, member.membershipId, next);
      setMembers((prev) =>
        prev.map((m) =>
          m.membershipId === member.membershipId ? { ...m, canViewAllProjects: next } : m
        )
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
        <Icon name="visibility" className="text-primary" />
        <h2 className="font-h3 text-h3 text-on-surface">Project Visibility</h2>
      </div>
      <div className="flex flex-col gap-sm p-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          By default, members only see projects they&apos;ve been explicitly granted access
          to (from the Team page). Turn this on for someone to let them see every project in
          the organization instead.
        </p>
        {error && (
          <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">{error}</p>
        )}
        {loading ? (
          <div className="flex justify-center py-md text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 20 }} />
          </div>
        ) : members.length === 0 ? (
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No other members yet.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-outline-variant">
            {members.map((m) => (
              <label
                key={m.membershipId}
                className="flex items-center justify-between gap-md py-sm"
              >
                <div>
                  <p className="font-body-sm text-body-sm font-bold text-on-surface">
                    {m.user.name}
                  </p>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    {m.user.email} · {m.role}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!m.canViewAllProjects}
                  disabled={pendingId === m.membershipId}
                  onChange={() => toggle(m)}
                  className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataExportSection({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const data = await api.exportOrgData(orgId);
      downloadJson(`envsync-export-${orgSlug}-${new Date().toISOString().slice(0, 10)}.json`, data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
        <Icon name="download" className="text-primary" />
        <h2 className="font-h3 text-h3 text-on-surface">Data Export</h2>
      </div>
      <div className="flex flex-col gap-sm p-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Download a JSON export of this organization&apos;s projects, environments, and
          members. Secret values are never included.
        </p>
        {error && (
          <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">{error}</p>
        )}
        <button
          type="button"
          disabled={exporting}
          onClick={onExport}
          className="flex w-fit items-center gap-xs rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-60"
        >
          <Icon
            name={exporting ? "progress_activity" : "download"}
            className={exporting ? "animate-spin" : ""}
          />
          {exporting ? "Exporting..." : "Download organization data"}
        </button>
      </div>
    </div>
  );
}

function AuditRetentionSection({ orgId }: { orgId: string }) {
  const confirm = useConfirm();
  const [before, setBefore] = useState("");
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const onPurge = async () => {
    if (!before) return;
    if (
      !(await confirm({
        title: "Delete Audit Log Entries",
        message: `This permanently deletes every log entry before ${before}. This cannot be undone.`,
        confirmLabel: "Delete",
        danger: true,
      }))
    ) {
      return;
    }
    setPurging(true);
    setError(null);
    setResult(null);
    try {
      const { deletedCount } = await api.purgeAuditLogs(orgId, before);
      setResult(deletedCount);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete log entries");
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
        <Icon name="delete_sweep" className="text-primary" />
        <h2 className="font-h3 text-h3 text-on-surface">Audit Log Retention</h2>
      </div>
      <div className="flex flex-col gap-sm p-md">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Permanently delete audit log entries older than a chosen date. This cannot be undone.
        </p>
        {error && (
          <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">{error}</p>
        )}
        {result !== null && (
          <p className="font-body-sm text-body-sm text-primary">
            {result} log {result === 1 ? "entry" : "entries"} deleted.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-sm">
          <label className="block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">
              Delete logs before
            </span>
            <input
              type="date"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <button
            type="button"
            disabled={!before || purging}
            onClick={onPurge}
            className="rounded-lg border border-[#CF222E] bg-transparent px-md py-sm font-body-sm text-body-sm font-bold text-[#CF222E] transition-colors hover:bg-[#CF222E] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/50 dark:text-red-400"
          >
            {purging ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrganizationTab() {
  const { activeOrg: org, organizations, refreshMe, switchOrg } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const { leave, leaving, error: leaveError } = useLeaveOrganization();

  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const onOrgCreated = async (newOrg: { id: string }) => {
    await refreshMe();
    switchOrg(newOrg.id);
    setShowCreateOrg(false);
  };

  const createOrgModal = (
    <Modal open={showCreateOrg} onClose={() => setShowCreateOrg(false)} title="Create Organization">
      <CreateOrgForm onCreated={onOrgCreated} onCancel={() => setShowCreateOrg(false)} />
    </Modal>
  );

  if (!org) {
    return (
      <div className="github-card flex flex-col items-center gap-md rounded-lg p-xl text-center">
        <p className="font-body-md text-body-md text-secondary">
          You don&apos;t have an organization yet.
        </p>
        <button
          type="button"
          onClick={() => setShowCreateOrg(true)}
          className="flex items-center gap-xs rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary"
        >
          <Icon name="add" style={{ fontSize: 18 }} />
          Create Organization
        </button>
        {createOrgModal}
      </div>
    );
  }

  const isAdmin = org.role === "OWNER" || org.role === "ADMIN";
  const isOwner = org.role === "OWNER";

  const onRename = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateOrg(org.id, { name });
      await refreshMe();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rename organization");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteOrg(org.id);
      const remaining = organizations.filter((o) => o.id !== org.id);
      await refreshMe();
      if (remaining[0]) {
        switchOrg(remaining[0].id);
      }
      router.push("/projects");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete organization");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)]">
        <div className="flex items-center justify-between gap-sm border-b border-outline-variant bg-surface-container-low p-md">
          <div className="flex items-center gap-sm">
            <Icon name="corporate_fare" className="text-primary" />
            <h2 className="font-h3 text-h3 text-on-surface">Organization</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateOrg(true)}
            className="flex items-center gap-xs rounded-lg border border-outline-variant px-sm py-1 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container"
          >
            <Icon name="add" style={{ fontSize: 16 }} />
            New Organization
          </button>
        </div>
        <div className="p-md">
          {isAdmin ? (
            <form onSubmit={onRename} className="flex max-w-md flex-col gap-md">
              <label className="block">
                <span className="mb-xs block font-label-md text-label-md text-on-surface">
                  Organization name
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                />
              </label>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Slug: {org.slug}
              </p>
              {error && (
                <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-md">
                <button
                  type="submit"
                  disabled={saving || name === org.name}
                  className="self-start rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                {saved && (
                  <span className="font-body-sm text-body-sm text-primary">Saved.</span>
                )}
              </div>
            </form>
          ) : (
            <div>
              <p className="font-body-md text-body-md font-bold text-on-surface">{org.name}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">{org.slug}</p>
              <p className="mt-sm font-body-sm text-[11px] text-on-surface-variant">
                Only Admins and Owners can rename this organization.
              </p>
            </div>
          )}
        </div>
      </div>

      {isOwner && <ProjectVisibilitySection orgId={org.id} />}

      {isOwner && <DataExportSection orgId={org.id} orgSlug={org.slug} />}

      {isOwner && <AuditRetentionSection orgId={org.id} />}

      {!isOwner && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
          <h4 className="flex items-center gap-sm font-body-md text-body-md font-bold text-on-surface">
            <Icon name="logout" />
            Leave Organization
          </h4>
          <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
            You&apos;ll lose access to {org.name} and everything in it immediately.
          </p>
          {leaveError && (
            <p className="mt-sm font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
              {leaveError}
            </p>
          )}
          <button
            type="button"
            disabled={leaving}
            onClick={leave}
            className="mt-md rounded-lg border border-outline-variant px-md py-sm font-body-sm text-body-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
          >
            {leaving ? "Leaving..." : `Leave ${org.name}`}
          </button>
        </div>
      )}

      {isOwner && (
        <div className="rounded-xl border border-[#CF222E]/30 bg-[#FFEBE9] p-md dark:border-red-500/30 dark:bg-red-500/10">
          <h4 className="flex items-center gap-sm font-body-md text-body-md font-bold text-[#CF222E] dark:text-red-400">
            <Icon name="warning" />
            Delete Organization
          </h4>
          <p className="mt-xs font-body-sm text-body-sm text-[#CF222E]/80 dark:text-red-400/80">
            This permanently deletes {org.name} and every project, environment,
            and secret inside it. This cannot be undone.
          </p>
          <label className="mt-md block max-w-sm">
            <span className="mb-xs block font-label-md text-label-md text-[#CF222E] dark:text-red-400">
              Type <span className="font-mono font-bold">{org.slug}</span> to confirm
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-lg border border-[#CF222E]/40 bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-[#CF222E] focus:ring-2 focus:ring-[#CF222E]/20"
            />
          </label>
          {deleteError && (
            <p className="mt-sm font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
              {deleteError}
            </p>
          )}
          <button
            type="button"
            disabled={confirmText !== org.slug || deleting}
            onClick={onDelete}
            className="mt-md rounded-lg border border-[#CF222E] bg-transparent px-md py-sm font-body-sm text-body-sm font-bold text-[#CF222E] transition-colors hover:bg-[#CF222E] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-500/50 dark:text-red-400"
          >
            {deleting ? "Deleting..." : `Delete ${org.name}`}
          </button>
        </div>
      )}

      {createOrgModal}
    </div>
  );
}
