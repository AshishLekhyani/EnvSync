"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  ApiError,
  EnvironmentSummary,
  MemberSummary,
  SecretMetadata,
  SecretVersionMetadata,
} from "@/lib/api";
import { getActionDisplay } from "@/lib/auditActions";

const MASKED = "••••••••••••••••••••••••";

function expiryBadge(expiresAt: string | null) {
  if (!expiresAt) {
    return { label: "—", className: "text-secondary" };
  }
  const diffDays = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays < 0) {
    return {
      label: "Expired",
      className:
        "rounded-full bg-[#FFEBE9] px-sm py-[1px] text-[10px] font-bold uppercase text-[#CF222E] dark:bg-red-500/10 dark:text-red-400",
    };
  }
  if (diffDays <= 7) {
    return {
      label: `Expires in ${diffDays}d`,
      className:
        "rounded-full bg-amber-50 px-sm py-[1px] text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    };
  }
  return {
    label: new Date(expiresAt).toLocaleDateString(),
    className: "font-body-sm text-body-sm text-secondary",
  };
}

export default function EnvironmentSecretsPage() {
  const { projectId, environmentId } = useParams<{
    projectId: string;
    environmentId: string;
  }>();
  const { activeOrg: org } = useAuth();

  const [environment, setEnvironment] = useState<EnvironmentSummary | null>(null);
  const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [versionsCache, setVersionsCache] = useState<Record<string, SecretVersionMetadata[]>>({});
  const [versionsLoading, setVersionsLoading] = useState<string | null>(null);
  const [versionRevealed, setVersionRevealed] = useState<Record<string, string>>({});
  const [versionVisible, setVersionVisible] = useState<Record<string, boolean>>({});
  const [revealingVersionKey, setRevealingVersionKey] = useState<string | null>(null);
  const [restoringVersionKey, setRestoringVersionKey] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [expiryDateInput, setExpiryDateInput] = useState("");
  const [savingExpiry, setSavingExpiry] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.getEnvironment(environmentId),
      api.listSecrets(environmentId),
      org ? api.listMembers(org.id) : Promise.resolve([]),
    ])
      .then(([env, secretList, memberList]) => {
        if (cancelled) return;
        setEnvironment(env);
        setSecrets(secretList);
        setMembers(memberList);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load environment");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [environmentId, org]);

  const memberName = (userId: string) => {
    const m = members.find((mm) => mm.user.id === userId);
    return m ? m.user.name : "Unknown";
  };

  const onToggleReveal = async (secretId: string) => {
    if (visible[secretId]) {
      setVisible((prev) => ({ ...prev, [secretId]: false }));
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      return;
    }

    setRevealingId(secretId);
    setError(null);
    try {
      const result = await api.revealSecret(secretId);
      setRevealed((prev) => ({ ...prev, [secretId]: result.value }));
      setVisible((prev) => ({ ...prev, [secretId]: true }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reveal secret");
    } finally {
      setRevealingId(null);
    }
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const secret = await api.createSecret(environmentId, {
        key: newKey,
        value: newValue,
        expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
      });
      setSecrets((prev) => [...prev, secret]);
      setNewKey("");
      setNewValue("");
      setNewExpiresAt("");
      setShowAdd(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create secret");
    } finally {
      setCreating(false);
    }
  };

  const onSaveEdit = async (secretId: string) => {
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await api.updateSecret(secretId, { value: editValue });
      setSecrets((prev) => prev.map((s) => (s.id === secretId ? updated : s)));
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      setVisible((prev) => ({ ...prev, [secretId]: false }));
      setEditingId(null);
      setEditValue("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update secret");
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async (secretId: string) => {
    if (!window.confirm("Delete this secret? This cannot be undone.")) return;
    setError(null);
    try {
      await api.deleteSecret(secretId);
      setSecrets((prev) => prev.filter((s) => s.id !== secretId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete secret");
    }
  };

  const loadVersions = async (secretId: string) => {
    setVersionsLoading(secretId);
    setError(null);
    try {
      const versions = await api.listSecretVersions(secretId);
      setVersionsCache((prev) => ({ ...prev, [secretId]: versions }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load version history");
    } finally {
      setVersionsLoading(null);
    }
  };

  const onToggleHistory = (secretId: string) => {
    if (expandedHistoryId === secretId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(secretId);
    if (!versionsCache[secretId]) {
      loadVersions(secretId);
    }
  };

  const onToggleVersionReveal = async (secretId: string, version: number) => {
    const key = `${secretId}:${version}`;

    if (versionVisible[key]) {
      setVersionVisible((prev) => ({ ...prev, [key]: false }));
      setVersionRevealed((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

    setRevealingVersionKey(key);
    setError(null);
    try {
      const result = await api.revealSecretVersion(secretId, version);
      setVersionRevealed((prev) => ({ ...prev, [key]: result.value }));
      setVersionVisible((prev) => ({ ...prev, [key]: true }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reveal version");
    } finally {
      setRevealingVersionKey(null);
    }
  };

  const onRotate = async (secretId: string) => {
    if (!window.confirm("Rotate this secret? A new random value will replace the current one.")) {
      return;
    }

    setRotatingId(secretId);
    setError(null);
    try {
      const { value, ...updated } = await api.rotateSecret(secretId);
      setSecrets((prev) => prev.map((s) => (s.id === secretId ? updated : s)));
      setRevealed((prev) => ({ ...prev, [secretId]: value }));
      setVisible((prev) => ({ ...prev, [secretId]: true }));
      if (expandedHistoryId === secretId) {
        await loadVersions(secretId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to rotate secret");
    } finally {
      setRotatingId(null);
    }
  };

  const onSaveExpiry = async (secretId: string) => {
    setSavingExpiry(true);
    setError(null);
    try {
      const updated = await api.setSecretExpiry(
        secretId,
        expiryDateInput ? new Date(expiryDateInput).toISOString() : null
      );
      setSecrets((prev) => prev.map((s) => (s.id === secretId ? updated : s)));
      setEditingExpiryId(null);
      setExpiryDateInput("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update expiry");
    } finally {
      setSavingExpiry(false);
    }
  };

  const onRestore = async (secretId: string, version: number) => {
    if (!window.confirm(`Restore version ${version}? This creates a new current version.`)) {
      return;
    }

    const key = `${secretId}:${version}`;
    setRestoringVersionKey(key);
    setError(null);
    try {
      const updated = await api.restoreSecretVersion(secretId, version);
      setSecrets((prev) => prev.map((s) => (s.id === secretId ? updated : s)));
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      setVisible((prev) => ({ ...prev, [secretId]: false }));
      await loadVersions(secretId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to restore version");
    } finally {
      setRestoringVersionKey(null);
    }
  };

  const filteredSecrets = search.trim()
    ? secrets.filter((s) => s.key.toLowerCase().includes(search.trim().toLowerCase()))
    : secrets;

  return (
    <AppShell
      searchPlaceholder="Search for secrets..."
      onSearch={setSearch}
      trailing={
        environment && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-xs rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-opacity-90 active:scale-95"
          >
            <Icon name="add" style={{ fontSize: 18 }} />
            Add Variable
          </button>
        )
      }
      mainClassName="flex-1 overflow-y-auto p-xl md:ml-64"
      showMobileNav={false}
    >
      <div className="mx-auto max-w-[1280px] pb-xl">
        {loading ? (
          <div className="flex justify-center py-xl text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 28 }} />
          </div>
        ) : !environment ? (
          <div className="github-card rounded-lg p-xl text-center font-body-md text-body-md text-secondary">
            {error ?? "Environment not found."}
          </div>
        ) : (
          <>
            <div className="mb-lg flex items-end justify-between">
              <div>
                <nav className="mb-xs flex items-center gap-xs font-body-sm text-body-sm text-secondary">
                  <Link href="/projects" className="hover:underline">
                    Projects
                  </Link>
                  <Icon name="chevron_right" style={{ fontSize: 14 }} />
                  <Link href={`/projects/${projectId}`} className="hover:underline">
                    Environments
                  </Link>
                  <Icon name="chevron_right" style={{ fontSize: 14 }} />
                  <span className="font-medium text-on-surface">{environment.name}</span>
                </nav>
                <h1 className="flex items-center gap-md font-h1 text-h1 text-on-surface">
                  Environment Variables
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-sm py-xs text-[10px] font-bold uppercase tracking-widest text-primary">
                    {environment.type}
                  </span>
                </h1>
              </div>
              <div className="flex items-center gap-xs rounded-lg border border-green-200 bg-green-50 px-md py-sm text-green-700 shadow-sm dark:border-[#40C463]/30 dark:bg-[#1F883D]/20 dark:text-[#40C463]">
                <Icon
                  name="lock"
                  filled
                  style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                />
                <span className="font-label-md text-label-md font-bold">AES-256 Encrypted</span>
              </div>
            </div>

            {error && (
              <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-2">
              <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm dark:bg-surface-container-lowest">
                <p className="mb-xs font-label-md text-label-md text-secondary">Total Secrets</p>
                <p className="font-h2 text-h2 font-black text-on-surface">{secrets.length}</p>
              </div>
              <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm dark:bg-surface-container-lowest">
                <p className="mb-xs font-label-md text-label-md text-secondary">Last Change</p>
                <p className="font-label-md text-label-md font-bold text-on-surface">
                  {secrets.length
                    ? new Date(
                        Math.max(...secrets.map((s) => new Date(s.updatedAt).getTime()))
                      ).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>

            {showAdd && (
              <form
                onSubmit={onCreate}
                className="github-card mb-xl flex flex-col gap-md rounded-lg p-md"
              >
                <h2 className="font-h3 text-h3 text-on-surface">Add Variable</h2>
                <div className="flex flex-col gap-md sm:flex-row">
                  <label className="block flex-1">
                    <span className="mb-xs block font-label-md text-label-md text-on-surface">
                      Key
                    </span>
                    <input
                      required
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                      placeholder="DATABASE_URL"
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-code-md text-code-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                    />
                  </label>
                  <label className="block flex-1">
                    <span className="mb-xs block font-label-md text-label-md text-on-surface">
                      Value
                    </span>
                    <input
                      required
                      type="password"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="secret value"
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-code-md text-code-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-xs block font-label-md text-label-md text-on-surface">
                      Expires On
                    </span>
                    <input
                      type="date"
                      value={newExpiresAt}
                      onChange={(e) => setNewExpiresAt(e.target.value)}
                      className="rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                    />
                  </label>
                </div>
                <div className="flex gap-sm">
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                  >
                    {creating ? "Adding..." : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm dark:bg-surface-container-lowest">
              <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-sm">
                <h2 className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
                  {environment.name} Variables
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-lowest">
                      <th className="w-1/4 px-md py-sm font-label-md text-label-md text-secondary">
                        Key
                      </th>
                      <th className="w-1/3 px-md py-sm font-label-md text-label-md text-secondary">
                        Value
                      </th>
                      <th className="px-md py-sm font-label-md text-label-md text-secondary">
                        Updated
                      </th>
                      <th className="px-md py-sm font-label-md text-label-md text-secondary">
                        Added By
                      </th>
                      <th className="px-md py-sm font-label-md text-label-md text-secondary">
                        Expires
                      </th>
                      <th className="px-md py-sm text-right font-label-md text-label-md text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredSecrets.map((secret) => (
                      <Fragment key={secret.id}>
                      <tr className="variable-row group transition-colors">
                        <td className="px-md py-sm">
                          <span className="rounded border border-outline-variant bg-surface-container px-xs py-[2px] font-code-md text-code-md text-on-surface">
                            {secret.key}
                          </span>
                        </td>
                        <td className="px-md py-sm">
                          {editingId === secret.id ? (
                            <div className="flex items-center gap-sm">
                              <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="New value"
                                className="w-full rounded border border-outline-variant bg-surface-container-low px-sm py-1 font-code-md text-code-md text-on-surface outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                disabled={savingEdit || !editValue}
                                onClick={() => onSaveEdit(secret.id)}
                                className="text-primary disabled:opacity-40"
                                aria-label="Save"
                              >
                                <Icon name="check" style={{ fontSize: 18 }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-secondary"
                                aria-label="Cancel"
                              >
                                <Icon name="close" style={{ fontSize: 18 }} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-sm">
                              <span
                                className={`font-code-md text-code-md text-secondary ${
                                  visible[secret.id] ? "" : "masked-value"
                                }`}
                              >
                                {visible[secret.id] ? revealed[secret.id] : MASKED}
                              </span>
                              <button
                                type="button"
                                disabled={revealingId === secret.id}
                                className="cursor-pointer text-primary opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
                                onClick={() => onToggleReveal(secret.id)}
                                aria-label={visible[secret.id] ? "Hide value" : "Reveal value"}
                              >
                                <Icon
                                  name={
                                    revealingId === secret.id
                                      ? "progress_activity"
                                      : visible[secret.id]
                                        ? "visibility_off"
                                        : "visibility"
                                  }
                                  className={revealingId === secret.id ? "animate-spin" : ""}
                                  style={{ fontSize: 18 }}
                                />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-secondary">
                          {new Date(secret.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-md py-sm font-body-sm text-body-sm text-on-surface">
                          {memberName(secret.updatedById)}
                        </td>
                        <td className="px-md py-sm">
                          {editingExpiryId === secret.id ? (
                            <div className="flex items-center gap-sm">
                              <input
                                autoFocus
                                type="date"
                                value={expiryDateInput}
                                onChange={(e) => setExpiryDateInput(e.target.value)}
                                className="rounded border border-outline-variant bg-surface-container-low px-sm py-1 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary"
                              />
                              <button
                                type="button"
                                disabled={savingExpiry}
                                onClick={() => onSaveExpiry(secret.id)}
                                className="text-primary disabled:opacity-40"
                                aria-label="Save expiry"
                              >
                                <Icon name="check" style={{ fontSize: 18 }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExpiryId(null)}
                                className="text-secondary"
                                aria-label="Cancel"
                              >
                                <Icon name="close" style={{ fontSize: 18 }} />
                              </button>
                            </div>
                          ) : (
                            (() => {
                              const badge = expiryBadge(secret.expiresAt);
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingExpiryId(secret.id);
                                    setExpiryDateInput(
                                      secret.expiresAt ? secret.expiresAt.slice(0, 10) : ""
                                    );
                                  }}
                                  className={badge.className}
                                >
                                  {badge.label}
                                </button>
                              );
                            })()
                          )}
                        </td>
                        <td className="px-md py-sm text-right">
                          <div className="flex justify-end gap-sm">
                            <button
                              type="button"
                              onClick={() => onToggleHistory(secret.id)}
                              className={`transition-colors hover:text-primary ${
                                expandedHistoryId === secret.id ? "text-primary" : "text-secondary"
                              }`}
                              aria-label="View history"
                            >
                              <Icon name="history" style={{ fontSize: 18 }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(secret.id);
                                setEditValue("");
                              }}
                              className="text-secondary transition-colors hover:text-primary"
                              aria-label="Edit value"
                            >
                              <Icon name="edit" style={{ fontSize: 18 }} />
                            </button>
                            <button
                              type="button"
                              disabled={rotatingId === secret.id}
                              onClick={() => onRotate(secret.id)}
                              className="text-secondary transition-colors hover:text-primary disabled:opacity-50"
                              aria-label="Rotate value"
                            >
                              <Icon
                                name="autorenew"
                                className={rotatingId === secret.id ? "animate-spin" : ""}
                                style={{ fontSize: 18 }}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(secret.id)}
                              className="text-secondary transition-colors hover:text-[#CF222E]"
                              aria-label="Delete secret"
                            >
                              <Icon name="delete" style={{ fontSize: 18 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedHistoryId === secret.id && (
                        <tr>
                          <td colSpan={6} className="bg-surface-container-low px-md py-md">
                            {versionsLoading === secret.id ? (
                              <div className="flex justify-center py-md text-secondary">
                                <Icon
                                  name="progress_activity"
                                  className="animate-spin"
                                  style={{ fontSize: 20 }}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-sm">
                                {(versionsCache[secret.id] ?? []).map((v) => {
                                  const versionKey = `${secret.id}:${v.version}`;
                                  const display = getActionDisplay(
                                    `secret.${v.changeType.toLowerCase()}`
                                  );
                                  const isCurrent = v.version === secret.currentVersion;
                                  return (
                                    <div
                                      key={v.id}
                                      className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm"
                                    >
                                      <div className="flex items-center gap-sm">
                                        <span className="rounded bg-surface-container-highest px-xs py-[2px] font-code-sm text-code-sm text-on-surface-variant">
                                          v{v.version}
                                        </span>
                                        <Icon
                                          name={display.icon}
                                          className={display.iconClass}
                                          style={{ fontSize: 16 }}
                                        />
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                          {display.label}
                                        </span>
                                        {isCurrent && (
                                          <span className="rounded-full bg-primary/10 px-sm py-[1px] text-[10px] font-bold uppercase text-primary">
                                            Current
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-md">
                                        <span
                                          className={`font-code-md text-code-md text-secondary ${
                                            versionVisible[versionKey] ? "" : "masked-value"
                                          }`}
                                        >
                                          {versionVisible[versionKey]
                                            ? versionRevealed[versionKey]
                                            : MASKED}
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                          {v.author.name}
                                        </span>
                                        <span className="font-body-sm text-body-sm text-secondary">
                                          {new Date(v.createdAt).toLocaleString()}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={revealingVersionKey === versionKey}
                                          onClick={() => onToggleVersionReveal(secret.id, v.version)}
                                          className="text-primary"
                                          aria-label={
                                            versionVisible[versionKey] ? "Hide value" : "Reveal value"
                                          }
                                        >
                                          <Icon
                                            name={
                                              revealingVersionKey === versionKey
                                                ? "progress_activity"
                                                : versionVisible[versionKey]
                                                  ? "visibility_off"
                                                  : "visibility"
                                            }
                                            className={
                                              revealingVersionKey === versionKey ? "animate-spin" : ""
                                            }
                                            style={{ fontSize: 18 }}
                                          />
                                        </button>
                                        {!isCurrent && (
                                          <button
                                            type="button"
                                            disabled={restoringVersionKey === versionKey}
                                            onClick={() => onRestore(secret.id, v.version)}
                                            className="font-label-md text-label-md text-xs font-bold text-primary hover:underline disabled:opacity-50"
                                          >
                                            {restoringVersionKey === versionKey
                                              ? "Restoring..."
                                              : "Restore"}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                                {(versionsCache[secret.id] ?? []).length === 0 && (
                                  <p className="py-sm text-center font-body-sm text-body-sm text-secondary">
                                    No history yet.
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    ))}

                    {secrets.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-md py-xl text-center font-body-md text-body-md text-secondary"
                        >
                          No secrets yet. Add your first variable above.
                        </td>
                      </tr>
                    )}
                    {secrets.length > 0 && filteredSecrets.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-md py-xl text-center font-body-md text-body-md text-secondary"
                        >
                          No secrets match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-xl">
              <h3 className="mb-md font-h3 text-h3 text-on-surface">Quick Access</h3>
              <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm dark:bg-surface-container-lowest">
                <div className="mb-sm flex items-center justify-between">
                  <span className="font-label-md text-[11px] uppercase tracking-widest text-secondary">
                    CLI Commands
                  </span>
                </div>
                <div className="rounded border border-outline-variant bg-surface-container-low p-md font-code-md text-code-md text-on-surface-variant">
                  <span className="font-bold text-primary">envsync</span> pull --project{" "}
                  {projectId} --environment {environmentId}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
