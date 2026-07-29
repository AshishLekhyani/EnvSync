import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

const members = [
  {
    name: "Sarah Jenkins",
    email: "s.jenkins@envsync.io",
    role: "Owner",
    roleClass:
      "border border-primary/20 bg-primary/10 text-primary",
    metaLabel: "Last Active",
    metaValue: "2 mins ago",
    metaAccent: false,
    selected: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCZrEtVmDAsQSiv7Ltz9mwM0qH7FVaFyBw-Im2OLa0byo1unHQS-oInttMAO_0dRR1RnDdmOxzE-eW2ZO5eiHQm7LXSFU1he_AOqsrqBbLn9BLZYrojrWOH5w3ow4FrGLwdE9OOa7GpRwzJjKZaElxR6NU_xoxlskcjvlodTP0VTTiBDT2LOWYBFqtKnkPewxQSO1Vw32IK8NeddGohAQzqTQ5rSsueaE5ru8F4DNW5aj2xqh4PlL6reBFjXNm9iwDsF7TIOouT12Iu",
  },
  {
    name: "Marcus Chen",
    email: "m.chen@envsync.io",
    role: "Admin",
    roleClass:
      "border border-outline-variant bg-surface-container-highest text-on-surface-variant",
    metaLabel: "Last Active",
    metaValue: "Yesterday",
    metaAccent: false,
    selected: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCF9aaAojl65feKgxYumUZpceMHX3l9rcW659gpO2LnYdWZlsc64v4WZZNwRjgr72dGYdep_uFYsdmW9E0Sjuhk8zHYU1swm5N4kVdDEP57NWo5igsFONsgilt3TCsEa_QW-XwYz3zRP0xktQPHiWY9r4JmWxr9sEgMSki8UQZsn6w4pDkPF2AHTU5l1Y_B2gH3tXzJ2u6dCQiLGimrqn61b9y0BYnvCZJNyHFjq0LkuDgLW_8EbYr3RNarPT69UUvSpNjr8P4mfUEG",
  },
  {
    name: "Alex Rivera",
    email: "a.rivera@envsync.io",
    role: "Developer",
    roleClass:
      "border border-outline-variant bg-surface-container-highest text-on-surface-variant",
    metaLabel: "Editing",
    metaValue: "Production Env",
    metaAccent: true,
    selected: true,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBE2n0EimVOnxO8D2Td6-RcnBvIjshaSmotPI2XfK2Q2skNwvzpr6F7sxLJjcujNFv73Dsz74DJQpKEuv9XuIH026f7pquzrvGP9FBBJmbQZLH2beYTbOCBskfFIHo9Z74ZFs2RrnESQ8TACPKZUB07WVBWufje-bedYljk-kKCCwqo43Lw6p-hhJMSDMmRQBoY60eRHxPQjeYorU1j3do9lFuhuUgP_idYXwHiiVT28qMuf7qMMKiqlpa49ycxvmaf0ikvjhGMJ0p1",
  },
  {
    name: "Elena Rodriguez",
    email: "e.rod@envsync.io",
    role: "Viewer",
    roleClass:
      "border border-outline-variant bg-surface-container-highest text-on-surface-variant",
    metaLabel: "Last Active",
    metaValue: "3 days ago",
    metaAccent: false,
    selected: false,
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuADved1wxfNyDluNF2_-5VPpu3ZaUUrEUKaOBczY0h0tOi-PpmwPCpECoid05VE7kvQSQwb4QUN3D7XW6mOiLL0fiWixhzw6Lv92ZkmLrRpvI1Me6P7vw6r-hwZC-r_dfsB8nIGHD16ItNTxwQPx_Oze9xVe3DG3BBFHz-tIY5dsPwRajmYIka3lt712XDjkh8iZPhmCHwQhrzZhleJi2-5w39hqo3LrCzZvUsU4fddX19WGyFjPQlIp5t3bFPrz7zX_2U4IQOcX9P0",
  },
];

export default function TeamPage() {
  return (
    <AppShell searchPlaceholder="Search team...">
      <div className="mx-auto max-w-container-max pb-xl">
        <div className="mb-lg flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">Access Control</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              Manage team members and their environment permissions.
            </p>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              className="flex items-center gap-xs rounded-lg border border-[#D0D7DE] bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-[#24292F] shadow-sm transition-colors hover:bg-surface-container-high dark:border-outline-variant dark:bg-surface-container-high dark:text-on-surface"
            >
              <Icon name="download" />
              Export Audit Log
            </button>
            <button
              type="button"
              className="flex items-center gap-xs rounded-lg border border-[#e2761d] bg-primary-container px-md py-sm font-label-md text-label-md text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <Icon name="person_add" />
              Invite Member
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-lg xl:grid-cols-12">
          <div className="flex flex-col gap-md xl:col-span-7">
            <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
              <div className="flex items-center justify-between border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
                <h3 className="font-label-md text-label-md font-bold text-on-surface">
                  Team Members
                  <span className="ml-sm rounded bg-outline-variant px-base py-[2px] text-[10px] text-on-surface-variant">
                    12 Total
                  </span>
                </h3>
                <div className="flex gap-sm">
                  <button
                    type="button"
                    className="font-body-sm text-body-sm font-bold text-primary hover:underline"
                  >
                    Filter
                  </button>
                  <button
                    type="button"
                    className="font-body-sm text-body-sm font-bold text-primary hover:underline"
                  >
                    Sort
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                {members.map((m) => (
                  <div
                    key={m.email}
                    className={`group flex cursor-pointer items-center justify-between px-md py-md transition-colors hover:bg-[#F6F8FA] dark:hover:bg-surface-container-low ${
                      m.selected ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-md">
                      <div
                        className={`h-10 w-10 overflow-hidden rounded-full border ${
                          m.selected
                            ? "border-primary-container"
                            : "border-outline-variant"
                        }`}
                      >
                        <img
                          src={m.avatar}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-sm">
                          <span className="font-body-md text-body-md font-bold text-on-surface">
                            {m.name}
                          </span>
                          <span
                            className={`rounded-full px-sm py-[1px] text-[10px] font-bold uppercase ${m.roleClass}`}
                          >
                            {m.role}
                          </span>
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-lg">
                      <div className="hidden text-right sm:block">
                        {m.metaAccent ? (
                          <>
                            <div className="flex items-center gap-xs text-[10px] font-bold uppercase text-primary">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                              {m.metaLabel}
                            </div>
                            <div className="font-body-sm text-body-sm font-medium text-on-surface">
                              {m.metaValue}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] font-bold uppercase text-on-surface-variant">
                              {m.metaLabel}
                            </div>
                            <div className="font-body-sm text-body-sm text-on-surface">
                              {m.metaValue}
                            </div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="p-sm text-outline transition-colors hover:text-on-surface"
                      >
                        <Icon name="more_vert" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-surface-container-lowest px-md py-sm text-center">
                <button
                  type="button"
                  className="font-body-sm text-body-sm font-bold text-primary hover:underline"
                >
                  View All Team Members
                </button>
              </div>
            </div>

            <div className="flex items-start gap-md rounded-xl border border-primary/20 bg-primary/5 p-md">
              <Icon name="info" className="text-primary" filled />
              <div>
                <h4 className="font-body-md text-body-md font-bold text-on-surface">
                  Role Propagation
                </h4>
                <p className="mt-xs font-body-sm text-body-sm text-on-surface-variant">
                  Roles assigned at the project level will automatically
                  propagate to all microservices and sub-environments unless
                  overridden in the Permission Matrix.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-md xl:col-span-5">
            <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
              <div className="border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
                <h3 className="font-label-md text-label-md font-bold text-on-surface">
                  Permission Matrix
                </h3>
              </div>
              <div className="custom-scrollbar overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      {["Role", "Dev", "Staging", "Prod"].map((h) => (
                        <th
                          key={h}
                          className="border-b border-[#D0D7DE] dark:border-outline-variant px-md py-sm text-[10px] font-bold uppercase text-on-surface-variant"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D0D7DE] dark:divide-outline-variant">
                    <tr>
                      <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                        Owner
                      </td>
                      {[0, 1, 2].map((i) => (
                        <td key={i} className="matrix-cell px-md py-md text-center">
                          <Icon name="verified_user" className="text-primary" filled />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                        Admin
                      </td>
                      {[0, 1, 2].map((i) => (
                        <td key={i} className="matrix-cell px-md py-md text-center">
                          <Icon name="check_circle" className="text-primary" filled />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                        Developer
                      </td>
                      <td className="matrix-cell px-md py-md text-center">
                        <Icon name="check_circle" className="text-primary" filled />
                      </td>
                      <td className="matrix-cell px-md py-md text-center">
                        <Icon name="check_circle" className="text-primary" filled />
                      </td>
                      <td className="matrix-cell px-md py-md text-center">
                        <Icon name="visibility" className="text-on-surface-variant" />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-md py-md font-body-sm text-body-sm font-bold text-on-surface">
                        Viewer
                      </td>
                      <td className="matrix-cell px-md py-md text-center">
                        <Icon name="visibility" className="text-on-surface-variant" />
                      </td>
                      <td className="matrix-cell px-md py-md text-center">
                        <Icon name="visibility" className="text-on-surface-variant" />
                      </td>
                      <td className="matrix-cell px-md py-md text-center">
                        <Icon name="block" className="text-error" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low p-md">
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center gap-sm">
                    <Icon
                      name="check_circle"
                      className="text-primary"
                      filled
                      style={{ fontSize: 16 }}
                    />
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      Full Read/Write Access
                    </span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Icon
                      name="visibility"
                      className="text-on-surface-variant"
                      style={{ fontSize: 16 }}
                    />
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      Read-only Access
                    </span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <Icon
                      name="block"
                      className="text-error"
                      style={{ fontSize: 16 }}
                    />
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      No Access (Hidden)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#D0D7DE] dark:border-outline-variant bg-white dark:bg-surface-container-lowest shadow-sm">
              <div className="flex items-center justify-between border-b border-[#D0D7DE] dark:border-outline-variant bg-surface-container-low px-md py-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  CLI Role Management
                </span>
                <button
                  type="button"
                  className="rounded p-xs transition-colors hover:bg-outline-variant"
                >
                  <Icon name="content_copy" className="text-on-surface-variant" />
                </button>
              </div>
              <div className="overflow-x-auto bg-surface-container-lowest p-md">
                <code className="block whitespace-nowrap font-code-md text-code-md text-on-surface">
                  <span className="font-bold text-primary">envsync</span> team
                  invite{" "}
                  <span className="text-on-tertiary-fixed-variant">
                    alex.r@envsync.io
                  </span>{" "}
                  --role{" "}
                  <span className="text-on-tertiary-fixed-variant">
                    developer
                  </span>
                </code>
              </div>
            </div>

            <div className="rounded-xl border border-[#CF222E]/30 bg-[#FFEBE9] p-md dark:border-red-500/30 dark:bg-red-500/10">
              <h4 className="flex items-center gap-sm font-body-md text-body-md font-bold text-[#CF222E] dark:text-red-400">
                <Icon name="gpp_maybe" />
                Sensitive Operations
              </h4>
              <p className="mt-xs font-body-sm text-body-sm text-[#CF222E]/80 dark:text-red-400/80">
                Changing &apos;Owner&apos; status requires Multi-Factor
                Authentication and a 24-hour verification window.
              </p>
              <button
                type="button"
                className="mt-md rounded-lg border border-[#CF222E] bg-transparent px-md py-sm font-body-sm text-body-sm font-bold text-[#CF222E] transition-all hover:bg-[#CF222E] hover:text-white dark:border-red-500/50 dark:text-red-400"
              >
                Request Role Ownership Change
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
