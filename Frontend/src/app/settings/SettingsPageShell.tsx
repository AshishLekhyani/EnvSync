import { AppShell } from "@/components/AppShell";

export function SettingsPageShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      showSearch={false}
      mainClassName="mx-auto w-full md:w-[calc(100%-16rem)] max-w-container-max flex-1 p-md lg:p-xl"
    >
      <div className="mb-lg">
        <h1 className="font-h1 text-h1 text-on-surface">Settings</h1>
        <p className="mt-xs font-body-md text-body-md text-secondary">
          Manage your profile, organization, and developer tools.
        </p>
      </div>
      {children}
    </AppShell>
  );
}
