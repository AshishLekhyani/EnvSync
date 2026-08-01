import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Changelog — EnvSync" };

const ENTRIES = [
  {
    version: "v0.18",
    date: "August 2026",
    title: "Google-only sign-in: password auth removed",
    items: [
      "Removed password-based signup and login entirely — Google is now the only way to sign in.",
      "Fixed a real vulnerability this surfaced: signup/reset/verification tokens could leak to an unauthenticated caller on a transient email-send failure, allowing account creation or takeover under someone else's email address. Removing password auth removes this attack surface entirely, since Google verifies email ownership instead of EnvSync issuing its own verification links.",
      "Signing in with Google for an email that already has an account (e.g. one created before this change) links to that existing account and its data, instead of creating a duplicate or rejecting the sign-in.",
      "Removed the separate Sign Up page, forgot/reset password, and email verification flows — one Google button on the login page covers both new and returning users.",
      "Settings → Profile no longer shows a password-change section — there's nothing to change.",
    ],
  },
  {
    version: "v0.17",
    date: "August 2026",
    title: "CLI overhaul: interactive menu, project linking, real fixes",
    items: [
      "envsync (no arguments) now launches an interactive, arrow-key menu that picks your project, environment, and action for you — no IDs or flags needed.",
      "envsync link remembers a project/environment for the current folder, so pull/push/run/status/environments no longer require --project/--environment.",
      "envsync --version now actually works (previously silently fell back to the help text).",
      "The CLI now retries and shows a \"waking up the server\" message during Render cold starts, matching the web app's own loading screen.",
      "envsync status now shows each key's last-updated time and flags anything changed remotely since your last pull.",
      "Fixed envsync run failing on Windows for npm/npx/yarn-based commands.",
      "Fixed a security gap where an API token could list every organization its creator belongs to, instead of only the one it was scoped to.",
      "Fixed several docs and in-app pages referencing the wrong CLI npm package name.",
      "Investigated real email delivery (SendGrid) but reverted to the existing copy-the-link flow after persistent spam-folder and deliverability issues without a verified sending domain.",
    ],
  },
  {
    version: "v0.16",
    date: "July 2026",
    title: "Going live: real email, verified signup, Google-only OAuth",
    items: [
      "Password reset, invites, and email verification now send real email via SMTP when configured, instead of only showing the link in the UI.",
      "Signup now requires email verification before an account is created — no more usable, unverified accounts.",
      "Removed GitHub OAuth sign-in; Google OAuth remains.",
      "Deployed to production (Vercel frontend, Render backend, Neon Postgres) with a branded loading screen for cold starts.",
      "Published the CLI to npm as @ashishlekhyani/envsync-cli.",
      "Added a real favicon and app icon.",
    ],
  },
  {
    version: "v0.15",
    date: "July 2026",
    title: "Live updates, real confirmation dialogs, audit retention",
    items: [
      "Leaving an organization or project, notifications, and access-request decisions now update live — no manual reload needed.",
      "Every confirmation dialog in the app is now a real modal instead of a browser popup.",
      "Notifications can be dismissed individually or cleared all at once, and arrive live instead of only refreshing when opened.",
      "You're now notified when your own project access request is approved or rejected.",
      "A quick \"leave organization\" shortcut was added next to the org switcher in the navbar.",
      "Owners can now delete an individual project, and can purge audit log entries older than a chosen date.",
      "Audit Logs are now paginated (40 per page) instead of a single capped list.",
      "Fixed a bug where a Developer or Admin without any project grants couldn't see their own row on the Team page.",
    ],
  },
  {
    version: "v0.14",
    date: "July 2026",
    title: "Integration guides, profile photos, security pass",
    items: [
      "Integrations restructured into a real setup guide per platform (GitHub Actions, Docker, Vercel, AWS), replacing a sidebar that just duplicated the page next to it.",
      "Added profile photos and notification preferences to Settings.",
      "Docs refreshed to cover project-level access control and the invite approval hierarchy.",
      "CLI can now authenticate from an ENVSYNC_TOKEN environment variable, for CI use without a persistent login step.",
      "Full dependency and endpoint security review across all three workspaces.",
    ],
  },
  {
    version: "v0.13",
    date: "July 2026",
    title: "Self-service leave, ownership transfer, project discovery",
    items: [
      "Any member can now leave an organization or project on their own, instead of requiring an Admin to remove them.",
      "Owners can transfer ownership directly, replacing the old disabled \"Request Role Ownership Change\" stub.",
      "Admins and Developers can browse the full project list and request access to projects they don't have; Viewer's access stays strictly grant-only.",
      "Audit Logs gained actor and date-range filters.",
      "Landing page's environment tabs, reveal, and copy became genuinely interactive; corrected inaccurate \"zero-knowledge encryption\" and \"SOC2/GDPR\" claims.",
      "CLI verified end-to-end against a live backend, including that a token without project access is rejected the same way the browser would be.",
    ],
  },
  {
    version: "v0.12",
    date: "July 2026",
    title: "Invite approval hierarchy, account deletion, live access push",
    items: [
      "Role assignment — for invites and role changes alike — is now capped strictly below your own role; only the Owner can assign any role.",
      "Developer-created invites require Admin approval, with optional auto-approve rules.",
      "Added account deletion, blocked while you're the sole owner of an organization with other members.",
      "Project access changes now push live to an already-open session instead of waiting for a reload.",
      "Audit log entries carry real detail (names, before/after values) instead of a generic fallback label.",
    ],
  },
  {
    version: "v0.11",
    date: "July 2026",
    title: "Project-level access control",
    items: [
      "Access to a project is now explicitly granted per member, not implied by org membership.",
      "Docs and Support links added to every section sidebar; sidebar rows expand on click, navigate on double-click.",
    ],
  },
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
