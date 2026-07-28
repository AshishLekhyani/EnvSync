"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

const MASKED = "••••••••••••••••••••••••";
const SAMPLE = "postgres://admin:pwd_secure@db.envsync.cloud:5432/main";

const variables = [
  { key: "DATABASE_URL", updated: "Oct 24, 2023", user: "j.doe", initials: "JD", primary: false },
  { key: "STRIPE_SECRET_KEY", updated: "Oct 22, 2023", user: "m.smith", initials: "MS", primary: true },
  { key: "AWS_ACCESS_KEY_ID", updated: "Oct 20, 2023", user: "j.doe", initials: "JD", primary: false },
  { key: "JWT_SECRET_TOKEN", updated: "Oct 19, 2023", user: "a.lee", initials: "AL", primary: false },
  { key: "REDIS_HOST", updated: "Oct 15, 2023", user: "m.smith", initials: "MS", primary: true },
];

export default function EnvironmentPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <AppShell
      searchPlaceholder="Search for secrets..."
      activeEnv="production"
      trailing={
        <button
          type="button"
          className="flex items-center gap-xs rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:bg-opacity-90 active:scale-95"
        >
          <Icon name="add" style={{ fontSize: 18 }} />
          Add Variable
        </button>
      }
      mainClassName="flex-1 overflow-y-auto p-xl md:ml-64"
      showMobileNav={false}
    >
      <div className="mx-auto max-w-[1280px] pb-xl">
        <div className="mb-lg flex items-end justify-between">
          <div>
            <nav className="mb-xs flex items-center gap-xs font-body-sm text-body-sm text-secondary">
              <span className="cursor-pointer hover:underline">Organization</span>
              <Icon name="chevron_right" style={{ fontSize: 14 }} />
              <span className="cursor-pointer hover:underline">EnvSync</span>
              <Icon name="chevron_right" style={{ fontSize: 14 }} />
              <span className="font-medium text-on-surface">Production</span>
            </nav>
            <h1 className="flex items-center gap-md font-h1 text-h1 text-on-surface">
              Environment Variables
              <span className="rounded-full border border-primary/20 bg-primary/10 px-sm py-xs text-[10px] font-bold uppercase tracking-widest text-primary">
                Active
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-xs rounded-lg border border-green-200 bg-green-50 px-md py-sm text-green-700 shadow-sm">
            <Icon
              name="lock"
              filled
              style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
            />
            <span className="font-label-md text-label-md font-bold">
              AES-256 Encrypted
            </span>
          </div>
        </div>

        <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm">
            <p className="mb-xs font-label-md text-label-md text-secondary">
              Total Secrets
            </p>
            <p className="font-h2 text-h2 font-black text-on-surface">142</p>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm">
            <p className="mb-xs font-label-md text-label-md text-secondary">
              Sync Status
            </p>
            <div className="flex items-center gap-xs text-green-600">
              <Icon name="sync" style={{ fontSize: 18 }} />
              <p className="font-label-md text-label-md font-bold">Healthy</p>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm">
            <p className="mb-xs font-label-md text-label-md text-secondary">
              Last Change
            </p>
            <p className="font-label-md text-label-md font-bold text-on-surface">
              2 mins ago
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-md shadow-sm">
            <div>
              <p className="mb-xs font-label-md text-label-md text-secondary">
                Project Health
              </p>
              <p className="font-label-md text-label-md font-bold text-on-surface">
                99.9% Up
              </p>
            </div>
            <div className="flex h-12 items-end gap-[2px]">
              <div className="h-3 w-1 rounded-full bg-primary/30" />
              <div className="h-5 w-1 rounded-full bg-primary/50" />
              <div className="h-4 w-1 rounded-full bg-primary/40" />
              <div className="h-8 w-1 rounded-full bg-primary/70" />
              <div className="h-10 w-1 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-md py-sm">
            <h2 className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">
              Production Variables
            </h2>
            <div className="flex gap-md">
              <button
                type="button"
                className="flex items-center gap-xs text-[12px] font-medium text-secondary transition-all hover:text-primary"
              >
                <Icon name="download" style={{ fontSize: 16 }} /> Export
              </button>
              <button
                type="button"
                className="flex items-center gap-xs text-[12px] font-medium text-secondary transition-all hover:text-primary"
              >
                <Icon name="history" style={{ fontSize: 16 }} /> History
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <th className="w-1/3 px-md py-sm font-label-md text-label-md text-secondary">
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
                  <th className="px-md py-sm text-right font-label-md text-label-md text-secondary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {variables.map((row, idx) => (
                  <tr
                    key={row.key}
                    className={`variable-row group cursor-pointer transition-colors ${
                      selected === idx ? "bg-primary/5" : ""
                    }`}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest("button")) {
                        setSelected(idx);
                      }
                    }}
                  >
                    <td className="px-md py-sm">
                      <span className="rounded border border-outline-variant bg-surface-container px-xs py-[2px] font-code-md text-code-md text-on-surface">
                        {row.key}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-sm">
                        <span
                          className={`font-code-md text-code-md text-secondary ${
                            revealed[idx] ? "" : "masked-value"
                          }`}
                        >
                          {revealed[idx] ? SAMPLE : MASKED}
                        </span>
                        <button
                          type="button"
                          className="cursor-pointer text-primary opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ fontSize: 18 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevealed((prev) => ({
                              ...prev,
                              [idx]: !prev[idx],
                            }));
                          }}
                        >
                          <Icon
                            name={revealed[idx] ? "visibility_off" : "visibility"}
                            style={{ fontSize: 18 }}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-md py-sm font-body-sm text-body-sm text-secondary">
                      {row.updated}
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-xs">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            row.primary
                              ? "bg-primary/20 text-primary"
                              : "bg-secondary-container text-on-surface"
                          }`}
                        >
                          {row.initials}
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface">
                          {row.user}
                        </span>
                      </div>
                    </td>
                    <td className="px-md py-sm text-right">
                      <button
                        type="button"
                        className="text-secondary transition-colors hover:text-primary"
                      >
                        <Icon name="more_vert" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-md py-sm">
            <span className="font-body-sm text-body-sm italic text-secondary">
              Showing 5 of 142 variables
            </span>
            <div className="flex gap-xs">
              <button
                type="button"
                disabled
                className="flex items-center justify-center rounded border border-outline-variant p-xs disabled:opacity-30"
              >
                <Icon name="chevron_left" style={{ fontSize: 18 }} />
              </button>
              <button
                type="button"
                className="rounded bg-primary px-sm py-xs text-[12px] font-bold text-on-primary"
              >
                1
              </button>
              <button
                type="button"
                className="rounded px-sm py-xs text-[12px] text-on-surface hover:bg-surface-container-high"
              >
                2
              </button>
              <button
                type="button"
                className="rounded px-sm py-xs text-[12px] text-on-surface hover:bg-surface-container-high"
              >
                3
              </button>
              <button
                type="button"
                className="flex items-center justify-center rounded border border-outline-variant p-xs"
              >
                <Icon name="chevron_right" style={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-xl">
          <h3 className="mb-md font-h3 text-h3 text-on-surface">Quick Access</h3>
          <div className="rounded-xl border border-outline-variant bg-white p-md shadow-sm">
            <div className="mb-sm flex items-center justify-between">
              <span className="font-label-md text-[11px] uppercase tracking-widest text-secondary">
                CLI Commands
              </span>
              <button
                type="button"
                className="flex items-center gap-xs font-label-md text-[12px] text-primary hover:underline"
              >
                <Icon name="content_copy" style={{ fontSize: 16 }} /> Copy all
              </button>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container-low p-md font-code-md text-code-md text-on-surface-variant">
              <span className="font-bold text-primary">envsync</span> env pull
              production
              <br />
              <span className="text-secondary">
                # Success: .env file generated with 142 variables
              </span>
            </div>
          </div>
        </div>

        <div className="mt-xl flex items-start gap-md rounded-xl border border-[#CF222E]/20 bg-[#FFEBE9] p-md">
          <Icon name="warning" className="text-[#CF222E]" filled />
          <div>
            <p className="font-label-md text-label-md font-bold text-[#CF222E]">
              Critical Variable Alert
            </p>
            <p className="font-body-sm text-body-sm text-[#CF222E]/80">
              3 variables in this environment will expire in less than 48 hours.
              Please rotate keys to avoid service interruption.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
