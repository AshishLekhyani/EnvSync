"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export function OrganizationTab() {
  const { activeOrg: org, organizations, refreshMe, switchOrg } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(org?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!org) {
    return (
      <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
        Create an organization on the Projects page first.
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
        <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
          <Icon name="corporate_fare" className="text-primary" />
          <h2 className="font-h3 text-h3 text-on-surface">Organization</h2>
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
    </div>
  );
}
