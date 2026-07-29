"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { ProfileTab } from "./ProfileTab";
import { OrganizationTab } from "./OrganizationTab";
import { CliTab } from "./CliTab";
import { SecurityTab } from "./SecurityTab";

const TABS = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "organization", label: "Organization", icon: "corporate_fare" },
  { id: "cli", label: "CLI & Tokens", icon: "terminal" },
  { id: "security", label: "Security", icon: "shield" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <AppShell
      showSearch={false}
      mainClassName="mx-auto w-full max-w-container-max flex-1 p-md md:ml-64 lg:p-xl"
    >
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface">Settings</h1>
        <p className="mt-xs font-body-md text-body-md text-secondary">
          Manage your profile, organization, and developer tools.
        </p>
      </div>

      <div className="mb-lg flex gap-xs overflow-x-auto border-b border-outline-variant">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-shrink-0 items-center gap-xs border-b-2 px-md py-sm font-label-md text-label-md transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-on-surface"
            }`}
          >
            <Icon name={t.icon} style={{ fontSize: 18 }} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab />}
      {tab === "organization" && <OrganizationTab />}
      {tab === "cli" && <CliTab />}
      {tab === "security" && <SecurityTab />}
    </AppShell>
  );
}
