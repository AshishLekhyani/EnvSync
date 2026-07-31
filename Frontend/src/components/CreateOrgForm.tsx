"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateOrgForm({
  onCreated,
  onCancel,
}: {
  onCreated: (org: { id: string; name: string; slug: string }) => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const slug = slugify(name);
    if (!slug) {
      setError("Organization name must contain at least one letter or number.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const org = await api.createOrg({ name, slug });
      setName("");
      await onCreated(org);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-md">
      <label className="block">
        <span className="mb-xs block font-label-md text-label-md text-on-surface">
          Organization name
        </span>
        <input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc"
          maxLength={100}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
        />
      </label>
      {error && (
        <p className="font-body-sm text-body-sm text-[#CF222E] dark:text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-sm">
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
