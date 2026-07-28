import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

const logs = [
  {
    icon: "edit",
    iconClass: "text-primary",
    action: "Changed",
    key: "API_KEY",
    project: "API Service",
    member: "Ashish",
    time: "12:05 PM",
  },
  {
    icon: "delete",
    iconClass: "text-error",
    action: "Deleted",
    key: "STRIPE_SECRET",
    project: "API Service",
    member: "Sarah Jenkins",
    time: "11:42 AM",
  },
  {
    icon: "history",
    iconClass: "text-tertiary",
    action: "Restored",
    key: "JWT_SECRET",
    project: "Frontend Web",
    member: "Marcus Chen",
    time: "10:18 AM",
    detail: "version 7",
  },
  {
    icon: "download",
    iconClass: "text-primary",
    action: "Downloaded",
    key: "Production secrets",
    project: "API Service",
    member: "Alex Rivera",
    time: "Yesterday",
  },
];

export default function AuditPage() {
  return (
    <AppShell searchPlaceholder="Search audit logs...">
      <div className="mx-auto max-w-container-max pb-xl">
        <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Audit Logs</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              Track every secret change, restore, and export across your
              organization.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-xs rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
          >
            <Icon name="download" />
            Export Logs
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#D0D7DE] bg-white shadow-sm">
          <div className="border-b border-[#D0D7DE] bg-surface-container-low px-md py-sm">
            <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-[#D0D7DE]">
            {logs.map((log) => (
              <div
                key={`${log.key}-${log.time}`}
                className="flex items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA]"
              >
                <div className="flex items-center gap-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low">
                    <Icon name={log.icon} className={log.iconClass} />
                  </div>
                  <div>
                    <p className="font-body-md text-body-md text-on-surface">
                      <span className="font-bold">{log.member}</span>{" "}
                      <span className="text-secondary">{log.action}</span>{" "}
                      <span className="rounded border border-outline-variant bg-surface-container px-xs py-[2px] font-code-md text-code-md">
                        {log.key}
                      </span>
                      {log.detail ? (
                        <span className="text-secondary"> ({log.detail})</span>
                      ) : null}
                    </p>
                    <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
                      {log.project}
                    </p>
                  </div>
                </div>
                <span className="font-body-sm text-body-sm text-secondary">
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
