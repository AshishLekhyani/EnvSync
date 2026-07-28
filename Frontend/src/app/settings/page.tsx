"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export default function SettingsPage() {
  const [showToast, setShowToast] = useState(false);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 3000);
    } catch {
      /* ignore */
    }
  };

  return (
    <AppShell
      showSearch={false}
      activeEnv="development"
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
            <h2 className="font-h3 text-h3 text-on-surface">Service Token</h2>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-md p-md">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Use this token to authenticate your local CLI session. Keep this
              secret and never commit it to source control.
            </p>
            <div>
              <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-high p-md">
                <div className="flex items-center gap-sm overflow-hidden">
                  <Icon
                    name="lock"
                    className="text-[#1F883D]"
                    filled
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  />
                  <span className="truncate pr-md font-code-md text-code-md text-on-surface">
                    envsync_live_9a2f_88bc2100_xk881m
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyText("envsync_live_9a2f_88bc2100_xk881m")
                  }
                  className="flex-shrink-0 rounded-md bg-primary-container p-sm text-on-primary-container transition-opacity hover:opacity-90"
                >
                  <Icon name="content_copy" />
                </button>
              </div>
              <div className="mt-sm flex items-center gap-xs text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#1F883D]" />
                Active Token
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-md">
              <div className="flex items-center gap-xs">
                <span className="rounded-full border border-[#40C463] bg-[#E6FFEC] px-2 py-0.5 text-[10px] font-bold text-[#116329]">
                  AES-256
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant">
                  End-to-End Encryption
                </span>
              </div>
              <button
                type="button"
                className="font-label-md text-label-md text-xs text-error hover:underline"
              >
                Revoke Token
              </button>
            </div>
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
