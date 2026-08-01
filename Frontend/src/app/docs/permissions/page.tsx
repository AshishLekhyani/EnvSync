import Link from "next/link";
import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "Roles & Permissions — EnvSync Docs" };

const ROLES = [
  {
    role: "Owner",
    desc: "Full access to every project in the org, always — no per-project grant needed. Owner access can't be overridden by the permission matrix below — an org can never accidentally lock itself out of managing itself.",
  },
  {
    role: "Admin",
    desc: "Full access by default within a project they've been granted Admin on, overridable per environment tier via the permission matrix. Can manage that project's members and create new projects (subject to Owner approval).",
  },
  {
    role: "Developer",
    desc: "Within a project they've been granted Developer on: read/write on Development, Testing, and Staging by default, read-only on Production by default.",
  },
  {
    role: "Viewer",
    desc: "Within a project they've been granted Viewer on: read-only on Development, Testing, and Staging by default, no access to Production by default.",
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
        Roles are per-project, not org-wide: being an Admin on one project doesn&apos;t give you
        Admin (or any access at all) on another. The Owner is the one exception, with unconditional
        full access to every project in the org.
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

      <section className="mb-lg">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Service tokens inherit identity</h2>
        <p className="font-body-md text-body-md text-secondary">
          A CLI service token isn&apos;t independently scoped — it can only ever do what its
          creator can do, evaluated against their live role at request time, and it&apos;s
          hard-locked to the single organization it was issued for. Token creation itself is
          gated to Admins and above, as a governance control on who can mint long-lived
          credentials, not because a token could otherwise exceed its creator&apos;s access.
        </p>
      </section>

      <section className="mb-lg">
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Project-level access</h2>
        <p className="mb-sm font-body-md text-body-md text-secondary">
          Being a member of an org doesn&apos;t give you a role in any particular project — a
          role is granted per project (from that project&apos;s Members panel), and it&apos;s
          that project-level role, not any org-wide standing, that the environment-tier matrix
          above is evaluated against. The Owner is the only exception: full access to every
          project, with no grant needed.
        </p>
        <p className="font-body-md text-body-md text-secondary">
          Anyone in the org — including a member with no project grants at all — can browse the
          full project list and request access to a specific project, optionally naming the
          role they&apos;re requesting. An Owner, or an Admin who already has access to that
          project, can approve or reject the request.
        </p>
      </section>

      <section>
        <h2 className="mb-sm font-h3 text-h3 text-on-surface">Inviting and changing roles</h2>
        <p className="mb-sm font-body-md text-body-md text-secondary">
          Inviting someone as Admin or Developer requires picking a project up front — that&apos;s
          the project they&apos;ll actually have that role in, not every project in the org. A
          Viewer invite can skip the project entirely and join org-only, since Viewer&apos;s
          browse-and-request path doesn&apos;t need one.
        </p>
        <p className="mb-sm font-body-md text-body-md text-secondary">
          Assigning an org-level role — by invite or by changing an existing member&apos;s role —
          is capped strictly below your own: an Admin can reach Developer or Viewer but never
          another Admin or Owner, a Developer can only ever reach Viewer, and a Viewer can&apos;t
          assign any role at all. Only the Owner can assign any role, including Owner (via a
          direct, immediate ownership transfer on the Team page). Anyone can also self-service
          request a role upgrade (Settings → Profile), routed to whoever has the authority to
          grant it.
        </p>
        <p className="font-body-md text-body-md text-secondary">
          An invite created by a Developer needs Admin approval before it&apos;s usable, unless
          an Admin has set up an auto-approve rule for that Developer or for the org as a whole
          (Team → Invites). Invites created by an Admin or Owner are usable immediately. Likewise,
          a project created by an Admin needs Owner approval unless the Owner has turned on
          auto-approve for that Admin — a project created by the Owner is immediate.
        </p>
      </section>
    </DocsShell>
  );
}
