"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, ApiTokenCreated, ApiTokenSummary } from "@/lib/api";

export default function SettingsPage() {
  const { organizations } = useAuth();
  const org = organizations[0] ?? null;

  const [showToast, setShowToast] = useState(false);

  const [tokens, setTokens] = useState<ApiTokenSummary[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [newTokenName, setNewTokenName] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [justCreatedToken, setJustCreatedToken] = useState<ApiTokenCreated | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!org) {
      setTokensLoading(false);
      return;
    }

    let cancelled = false;
    setTokensLoading(true);

    api
      .listApiTokens(org.id)
      .then((result) => {
        if (!cancelled) {
          setTokens(result);
          setTokenError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTokenError(err instanceof ApiError ? err.message : "Failed to load tokens");
        }
      })
      .finally(() => {
        if (!cancelled) setTokensLoading(false);
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

  const onCreateToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setCreatingToken(true);
    setTokenError(null);

    try {
      const created = await api.createApiToken(org.id, { name: newTokenName });
      setTokens((prev) => [created, ...prev]);
      setJustCreatedToken(created);
      setNewTokenName("");
    } catch (err) {
      setTokenError(err instanceof ApiError ? err.message : "Failed to create token");
    } finally {
      setCreatingToken(false);
    }
  };

  const onRevokeToken = async (tokenId: string) => {
    if (!org) return;
    if (!window.confirm("Revoke this token? Anything using it will stop working immediately.")) {
      return;
    }
    setRevokingId(tokenId);
    setTokenError(null);

    try {
      const updated = await api.revokeApiToken(org.id, tokenId);
      setTokens((prev) => prev.map((t) => (t.id === tokenId ? updated : t)));
    } catch (err) {
      setTokenError(err instanceof ApiError ? err.message : "Failed to revoke token");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AppShell
      showSearch={false}
      mainClassName="mx-auto w-full max-w-container-max flex-1 p-md md:ml-64 lg:p-xl"
    >
      <div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-end">
        <div>
          <nav className="mb-sm flex items-center gap-sm text-on-surface-variant">
            <span className="font-label-md text-label-md">Environments</span>
            <Icon name="chevron_right" className="text-[16px]" />
            <span className="font-label-md text-label-md">Core API</span>
            <Icon name="chevron_right" className="text-[16px]" />
            <span className="font-label-md text-label-md font-bold text-primary">
              CLI Integration
            </span>
          </nav>
          <h1 className="font-h1 text-h1 text-on-surface">
            CLI Integration Guide
          </h1>
          <p className="mt-xs max-w-2xl font-body-md text-body-md text-secondary">
            Connect your local development environment to EnvSync using our
            command-line interface. Securely pull and manage environment
            variables with AES-256 encryption.
          </p>
        </div>
        <div className="flex items-center gap-sm rounded-lg border border-outline-variant bg-surface-container px-md py-sm">
          <Icon name="sync" className="text-primary" style={{ fontSize: 20 }} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Last Synced
            </p>
            <p className="font-label-md text-label-md text-on-surface">
              2 minutes ago
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-12">
        <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)] lg:col-span-7">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-md">
            <div className="flex items-center gap-sm">
              <Icon name="download_for_offline" className="text-primary" />
              <h2 className="font-h3 text-h3 text-on-surface">1. Install CLI</h2>
            </div>
            <span className="rounded bg-tertiary-container px-sm py-1 font-label-md text-label-md text-on-tertiary-container text-xs">
              v1.0.0
            </span>
          </div>
          <div className="space-y-md p-md">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Install the EnvSync CLI globally via npm to manage your environment
              secrets from any directory.
            </p>
            <div className="overflow-hidden rounded-lg border border-[#30363D]">
              <div className="code-block-header flex items-center justify-between px-md py-sm">
                <span className="font-code-sm text-code-sm text-[#8B949E]">
                  Terminal
                </span>
                <button
                  type="button"
                  onClick={() => copyText("npm install -g envsync-cli")}
                  className="flex items-center gap-xs font-label-md text-xs text-on-primary-fixed-variant transition-colors hover:text-primary-container"
                >
                  <Icon name="content_copy" className="text-sm" />
                  Copy
                </button>
              </div>
              <div className="code-block-body p-md">
                <code className="font-code-md text-code-md text-[#E6EDF3]">
                  <span className="text-[#FF7B72]">npm</span> install -g
                  envsync-cli
                </code>
              </div>
            </div>
            <div className="rounded-lg border-l-4 border-primary bg-surface-container p-md">
              <div className="flex gap-sm">
                <Icon name="info" className="text-primary" />
                <div>
                  <p className="font-body-md text-body-md font-bold text-on-surface">
                    Quick Tip
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Ensure your node version is 16.x or higher for optimal
                    performance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)] lg:col-span-5">
          <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
            <Icon name="key" className="text-primary" />
            <h2 className="font-h3 text-h3 text-on-surface">Service Tokens</h2>
          </div>
          <div className="flex flex-1 flex-col gap-md p-md">
            {!org ? (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Create an organization on the Projects page first.
              </p>
            ) : (
              <>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Use a service token to authenticate the EnvSync CLI. Keep it
                  secret and never commit it to source control.
                </p>

                {tokenError && (
                  <div className="rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    {tokenError}
                  </div>
                )}

                {justCreatedToken ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-md">
                    <p className="mb-xs font-label-md text-label-md font-bold text-on-surface">
                      {justCreatedToken.name}
                    </p>
                    <p className="mb-sm font-body-sm text-body-sm text-on-surface-variant">
                      Copy this token now — it won&apos;t be shown again.
                    </p>
                    <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-high p-md">
                      <span className="truncate pr-md font-code-md text-code-md text-on-surface">
                        {justCreatedToken.token}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(justCreatedToken.token)}
                        className="flex-shrink-0 rounded-md bg-primary-container p-sm text-on-primary-container transition-opacity hover:opacity-90"
                      >
                        <Icon name="content_copy" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJustCreatedToken(null)}
                      className="mt-sm font-label-md text-label-md text-xs text-primary hover:underline"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onCreateToken} className="flex gap-sm">
                    <input
                      required
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      placeholder="Token name (e.g. CI)"
                      className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary-container"
                    />
                    <button
                      type="submit"
                      disabled={creatingToken}
                      className="flex-shrink-0 rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary disabled:opacity-60"
                    >
                      {creatingToken ? "..." : "Generate"}
                    </button>
                  </form>
                )}

                <div className="flex max-h-56 flex-col gap-xs overflow-y-auto">
                  {tokensLoading ? (
                    <div className="flex justify-center py-md text-secondary">
                      <Icon
                        name="progress_activity"
                        className="animate-spin"
                        style={{ fontSize: 20 }}
                      />
                    </div>
                  ) : tokens.length === 0 ? (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      No tokens yet.
                    </p>
                  ) : (
                    tokens.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-high px-md py-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-xs">
                            <span className="truncate font-label-md text-label-md text-on-surface">
                              {t.name}
                            </span>
                            {t.revokedAt && (
                              <span className="rounded-full bg-error/10 px-sm py-[1px] text-[10px] font-bold uppercase text-error">
                                Revoked
                              </span>
                            )}
                          </div>
                          <p className="font-body-sm text-[11px] text-on-surface-variant">
                            {t.createdBy.name} ·{" "}
                            {t.lastUsedAt
                              ? `Used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                              : "Never used"}
                          </p>
                        </div>
                        {!t.revokedAt && (
                          <button
                            type="button"
                            disabled={revokingId === t.id}
                            onClick={() => onRevokeToken(t.id)}
                            className="flex-shrink-0 font-label-md text-label-md text-xs text-error hover:underline disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <p className="mt-auto border-t border-outline-variant pt-md font-body-sm text-[11px] text-on-surface-variant">
                  Tokens are hashed at rest with AES-256 and can be revoked at any time.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-[0_1px_0_rgba(27,31,35,0.04)] lg:col-span-12">
          <div className="flex items-center gap-sm border-b border-outline-variant bg-surface-container-low p-md">
            <Icon name="terminal" className="text-primary" />
            <h2 className="font-h3 text-h3 text-on-surface">
              2. Initialize &amp; Pull
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-lg p-md md:grid-cols-2">
            <div className="space-y-md">
              <div className="space-y-sm">
                <h4 className="font-body-md text-body-md font-bold text-on-surface">
                  Authentication
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  First, login with your service token. This only needs to be
                  done once per environment.
                </p>
                <div className="overflow-hidden rounded-lg border border-[#30363D]">
                  <div className="code-block-body p-md">
                    <code className="font-code-md text-code-md text-[#E6EDF3]">
                      <span className="text-[#FF7B72]">envsync</span> login{" "}
                      <span className="text-[#79C0FF]">&lt;your-token&gt;</span>
                    </code>
                  </div>
                </div>
              </div>
              <div className="space-y-sm">
                <h4 className="font-body-md text-body-md font-bold text-on-surface">
                  Fetch Variables
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Pull the latest secrets into your project. This will create or
                  update your{" "}
                  <span className="rounded bg-surface-container px-1 py-0.5 font-code-sm text-code-sm">
                    .env
                  </span>{" "}
                  file.
                </p>
                <div className="overflow-hidden rounded-lg border border-[#30363D]">
                  <div className="code-block-body flex items-center justify-between p-md">
                    <code className="font-code-md text-code-md text-[#E6EDF3]">
                      <span className="text-[#FF7B72]">envsync</span> pull
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText("envsync pull")}
                      className="text-[#8B949E] transition-colors hover:text-on-primary"
                    >
                      <Icon name="content_copy" className="text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-md border-outline-variant pt-md md:border-l md:pl-lg md:pt-0">
              <h4 className="font-body-md text-body-md font-bold text-on-surface">
                Common Commands
              </h4>
              <div className="space-y-md">
                {[
                  {
                    cmd: "envsync run -- <app>",
                    desc: "Inject variables directly into your process without using files.",
                  },
                  {
                    cmd: "envsync status",
                    desc: "Check the drift between your local environment and EnvSync servers.",
                  },
                  {
                    cmd: "envsync help",
                    desc: "List all available commands and global flags.",
                  },
                ].map((item) => (
                  <div key={item.cmd} className="group flex items-start gap-md">
                    <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary transition-transform group-hover:scale-125" />
                    <div>
                      <p className="font-code-md text-code-md font-bold text-on-surface">
                        {item.cmd}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-md rounded-lg border border-outline-variant bg-surface-container-low p-md">
                <p className="mb-sm text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Pro Feature
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Enable{" "}
                  <span className="font-bold text-on-surface">Auto-sync</span> to
                  automatically pull changes when teammates update production
                  secrets.
                </p>
                <button
                  type="button"
                  className="mt-sm flex items-center gap-xs text-xs font-bold text-primary hover:underline"
                >
                  Learn More
                  <Icon name="arrow_forward" style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-xl flex flex-col items-center justify-between gap-md border-t border-outline-variant pb-xl pt-lg md:flex-row">
        <div className="flex items-center gap-md font-body-sm text-body-sm text-on-surface-variant">
          <span className="flex items-center gap-xs">
            <Icon name="verified" style={{ fontSize: 16 }} />
            Verified CLI
          </span>
          <span className="flex items-center gap-xs">
            <Icon name="policy" style={{ fontSize: 16 }} />
            SOC2 Compliant
          </span>
        </div>
        <div className="flex items-center gap-lg">
          <a
            href="#"
            className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            Release Notes
          </a>
          <a
            href="#"
            className="font-body-sm text-body-sm text-on-surface-variant transition-colors hover:text-primary"
          >
            Security Policy
          </a>
          <button
            type="button"
            className="flex items-center gap-sm rounded-lg bg-on-surface px-md py-2 font-label-md text-label-md text-surface transition-all hover:bg-opacity-90"
          >
            <Icon name="forum" style={{ fontSize: 20 }} />
            Talk to Support
          </button>
        </div>
      </div>

      <div
        className={`copy-toast fixed bottom-lg right-lg z-[100] flex items-center gap-md rounded-xl bg-inverse-surface px-lg py-md text-inverse-on-surface shadow-xl ${
          showToast ? "show" : ""
        }`}
      >
        <Icon name="check_circle" className="text-primary-fixed-dim" />
        <div>
          <p className="font-body-md text-body-md font-bold">
            Copied to Clipboard
          </p>
          <p className="font-body-sm text-body-sm opacity-80">
            Ready to paste into your terminal.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
