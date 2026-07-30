import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Changelog — EnvSync" };

const ENTRIES = [
  {
    version: "v0.10",
    date: "July 2026",
    title: "Contextual sidebar, real Docs, and password reset",
    items: [
      "Sidebar redesigned to be always-present and contextual per section (Projects, Team, Audit, Integrations, Settings) instead of one static panel.",
      "Settings and Team pages restructured into real sub-routes with sidebar navigation.",
      "Added a real Docs section covering Getting Started, the CLI, security architecture, permissions, and integrations.",
      "Added forgot/reset password, using the same dev-mode link pattern as org invites.",
      "Audit Logs gained a real per-project filter; Integrations gained jump-to navigation.",
      "Replaced every dead footer link (Changelog, Documentation, About, Privacy, etc.) with a real page.",
    ],
  },
  {
    version: "v0.9.1",
    date: "July 2026",
    title: "Session & auth stabilization",
    items: [
      "Fixed a race between page data-fetching and the login bootstrap that could cause a spurious first-load error.",
      "Added automatic silent token refresh so an expired access token no longer requires a manual reload.",
      "Session revocation now takes effect in real time via a live event channel, instead of waiting for the affected device's next reload.",
      "Logged-in users are redirected away from the login, signup, and landing pages instead of seeing them again.",
    ],
  },
  {
    version: "v0.9",
    date: "July 2026",
    title: "UX overhaul: multi-org support, TanStack Query",
    items: [
      "Introduced multi-organization switching with a persistent active-org selection.",
      "Migrated data fetching to TanStack Query, eliminating duplicate network calls across the sidebar and page content.",
      "Rebuilt Settings around Profile, Organization, CLI & Tokens, and Security.",
      "Added real profile editing, in-app password change, and organization rename/delete.",
      "Project cards now show real environment counts instead of nothing.",
    ],
  },
  {
    version: "v0.8",
    title: "Security hardening pass",
    items: [
      "Service tokens hard-scoped to their issuing organization, closing an account-wide blast-radius gap.",
      "Cross-org resource access now returns 404 instead of 403, closing an existence-enumeration leak.",
      "Added Helmet security headers on the API and equivalent headers on the web app, including a production Content-Security-Policy.",
      "Fixed CSV export formula-injection risk in audit log exports.",
      "Pinned JWT algorithm and password-hashing cost parameters explicitly.",
    ],
  },
  {
    version: "v0.7",
    title: "CLI push, Google OAuth, integrations",
    items: [
      "Added envsync push to sync a local .env back up to the server.",
      "Added Google OAuth sign-in alongside GitHub.",
      "Added the Integrations page with real, working snippets for GitHub Actions, Docker, Vercel, and AWS Secrets Manager.",
    ],
  },
  {
    version: "v0.6",
    title: "GitHub OAuth, invites, configurable permissions",
    items: [
      "Added GitHub OAuth sign-in.",
      "Added shareable invite links for adding teammates who don't have an account yet.",
      "Made the role × environment-tier permission matrix editable per organization, on top of sane defaults.",
    ],
  },
  {
    version: "v0.5",
    title: "Secret lifecycle & notifications",
    items: [
      "Added secret expiration dates and an automated expiry scan.",
      "Added an in-app notification bell for expiring and expired secrets.",
      "Added CSV export for the audit log.",
    ],
  },
  {
    version: "v0.4",
    title: "Security hardening",
    items: [
      "Added rate limiting on login and signup.",
      "Fixed reverse-proxy IP handling for accurate audit log attribution.",
      "Added an Active Sessions panel with per-device revocation.",
    ],
  },
  {
    version: "v0.3",
    title: "API tokens, CLI, secret rotation",
    items: [
      "Added service API tokens for CI/CD and the CLI.",
      "Shipped the EnvSync CLI: login, pull, push, run, status, projects, environments — zero runtime dependencies.",
      "Added one-click secret rotation with a full audit trail.",
    ],
  },
  {
    version: "v0.2",
    title: "Audit logs & secret version history",
    items: [
      "Added a full, filterable audit log.",
      "Added secret version history with restore.",
    ],
  },
  {
    version: "v0.1",
    title: "Core loop",
    items: [
      "Auth, organizations, projects, environments, and AES-256-GCM encrypted secrets.",
      "Role-based access control across four roles and four environment tiers.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-[40px] text-on-surface">Changelog</h1>
        <p className="mb-xl font-body-lg text-body-lg text-secondary">
          What&apos;s actually shipped, in order. Unlike the rest of this site&apos;s marketing
          pages, this one is a real record of the product&apos;s build history.
        </p>

        <div className="flex flex-col gap-lg">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="rounded-xl border border-outline-variant bg-white p-lg dark:bg-surface-container-lowest">
              <div className="mb-sm flex flex-wrap items-center gap-sm">
                <span className="rounded-full bg-primary/10 px-sm py-1 font-code-sm text-code-sm font-bold text-primary">
                  {entry.version}
                </span>
                {entry.date && (
                  <span className="font-body-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                    {entry.date}
                  </span>
                )}
              </div>
              <h2 className="mb-sm font-h3 text-h3 text-on-surface">{entry.title}</h2>
              <ul className="flex flex-col gap-xs">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-xs font-body-sm text-body-sm text-secondary">
                    <Icon name="check_circle" className="mt-[2px] flex-shrink-0 text-primary" style={{ fontSize: 16 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
