import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Careers — EnvSync" };

const ROLES = [
  {
    title: "Backend Engineer",
    location: "Remote",
    type: "Full-time",
    desc: "Own encryption, RBAC, and audit infrastructure. Node/TypeScript, PostgreSQL, and a healthy paranoia about anything touching secret material.",
  },
  {
    title: "Frontend Engineer",
    location: "Remote",
    type: "Full-time",
    desc: "Next.js/React on the dashboard and CLI-adjacent tooling. Care about the difference between a control that looks functional and one that is.",
  },
  {
    title: "Developer Relations",
    location: "Remote",
    type: "Contract",
    desc: "Write docs people actually read, build integration guides, and be the loudest advocate for whatever's confusing about the product this week.",
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-[40px] text-on-surface">Careers</h1>
        <p className="mb-xl font-body-lg text-body-lg text-secondary">
          We&apos;re a small, remote-first team working on infrastructure that teams trust with
          their most sensitive data. Here&apos;s what we&apos;re looking for right now.
        </p>

        <div className="mb-xl flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest">
          {ROLES.map((role) => (
            <div key={role.title} className="flex flex-col justify-between gap-sm p-lg sm:flex-row sm:items-center">
              <div>
                <h3 className="mb-xs font-h3 text-h3 text-on-surface">{role.title}</h3>
                <p className="font-body-sm text-body-sm text-secondary">{role.desc}</p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-sm">
                <span className="rounded-full bg-surface-container-highest px-sm py-1 text-[11px] text-on-surface-variant">
                  {role.location}
                </span>
                <span className="rounded-full bg-primary/10 px-sm py-1 text-[11px] text-primary">
                  {role.type}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-md rounded-xl border border-primary/20 bg-primary/5 p-md">
          <Icon name="info" className="text-primary" filled />
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Don&apos;t see a fit? We&apos;re a small team and not actively hiring beyond the
            roles above — but reach out at{" "}
            <a href="mailto:careers@envsync.io" className="text-primary hover:underline">
              careers@envsync.io
            </a>{" "}
            anyway.
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
