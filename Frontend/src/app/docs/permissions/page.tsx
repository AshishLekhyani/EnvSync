import Link from "next/link";
import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "Roles & Permissions — EnvSync Docs" };

const ROLES = [
  {
    role: "Owner",
    desc: "Full access everywhere, always. Owner access can't be overridden by the permission matrix below — an org can never accidentally lock itself out of managing itself.",
  },
  {
    role: "Admin",
    desc: "Full access by default, same as Owner, but overridable per environment tier via the permission matrix. Can manage members, tokens, and org settings.",
  },
  {
    role: "Developer",
    desc: "Read/write on Development, Testing, and Staging by default; read-only on Production by default.",
  },
  {
    role: "Viewer",
    desc: "Read-only on Development, Testing, and Staging by default; no access to Production by default.",
  },
];

export default function PermissionsDocsPage() {
  return (
    <DocsShell>
      <p className="mb-xs font-label-md text-label-md uppercase tracking-wider text-primary">
        Docs
      </p>
      <h1 className="mb-md font-h1 text-h1 text-on-surface">Roles &amp; Permissions</h1>
      <p className="mb-xl font-body-lg text-body-lg text-secondary">
        A four-role hierarchy, plus a configurable matrix for the exceptions.
      </p>

      <div className="mb-xl flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest">
        {ROLES.map((r) => (
          <div key={r.role} className="p-md">
            <p className="mb-xs font-body-md text-body-md font-bold text-on-surface">{r.role}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{r.desc}</p>
          </div>
        ))}
      </div>

      <section className="mb-lg">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">The default matrix</h2>
        <p className="font-body-md text-body-md text-secondary">
          Every role×environment-tier combination above is a sensible default, not a hardcoded
          rule. Admins can open a org&apos;s{" "}
          <Link href="/team/permissions" className="text-primary hover:underline">
            Permission Matrix
          </Link>{" "}
          and grant or restrict access per role, per tier — for example, giving Viewers
          read-only access to Production for an incident review, without giving them write
          access anywhere. Overrides are sparse: a role/tier combination with no explicit
          override simply falls back to the default above, so most orgs never need to touch it.
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Service tokens inherit identity</h2>
        <p className="font-body-md text-body-md text-secondary">
          A CLI service token isn&apos;t independently scoped — it can only ever do what its
          creator can do, evaluated against their live role at request time, and it&apos;s
          hard-locked to the single organization it was issued for. Token creation itself is
          gated to Admins and above, as a governance control on who can mint long-lived
          credentials, not because a token could otherwise exceed its creator&apos;s access.
        </p>
      </section>
    </DocsShell>
  );
}
