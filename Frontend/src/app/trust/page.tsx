import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Trust Center — EnvSync" };

const PILLARS = [
  {
    icon: "enhanced_encryption",
    title: "Encryption at rest",
    body: "Every secret value is encrypted with AES-256-GCM — an authenticated cipher, so tampering is detectable, not just blocked. Each organization has its own encryption key, itself wrapped by a master key never exposed outside the server process.",
  },
  {
    icon: "vpn_key",
    title: "Authentication",
    body: "Sign-in is Google-only — EnvSync never stores or verifies a password, since Google already verifies the account owner controls that email. Sessions use short-lived JWT access tokens plus a rotating, opaque refresh token — only its hash is ever stored. A revoked session is force-signed-out in real time, not on next reload.",
  },
  {
    icon: "admin_panel_settings",
    title: "Access control",
    body: "A four-role hierarchy (Owner/Admin/Developer/Viewer) with a configurable per-environment permission matrix, plus a separate layer controlling which projects a member can see at all — explicit per-project grants, not implied by org membership. Service tokens inherit their creator's live permissions and are hard-scoped to a single organization — a leaked CI token can't reach any other org.",
  },
  {
    icon: "history",
    title: "Audit logging",
    body: "Every mutating action and every secret reveal writes an immutable audit log entry — actor, action, target, and timestamp. Logs are exportable to CSV for your own review or compliance process.",
  },
  {
    icon: "security",
    title: "Application hardening",
    body: "Rate limiting on authentication endpoints, standard security headers (HSTS, X-Frame-Options, Content-Security-Policy) on every response, and dependency auditing as part of our release process.",
  },
];

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-[40px] text-on-surface">Trust Center</h1>
        <p className="mb-xl font-body-lg text-body-lg text-secondary">
          The real technical architecture behind EnvSync — not a marketing summary. If you want
          more detail on any of this, see the{" "}
          <a href="/docs/security" className="text-primary hover:underline">
            Security &amp; Encryption
          </a>{" "}
          docs page.
        </p>

        <div className="flex flex-col gap-lg">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex gap-md rounded-xl border border-outline-variant bg-white p-lg dark:bg-surface-container-lowest">
              <Icon name={p.icon} className="flex-shrink-0 text-primary" style={{ fontSize: 28 }} />
              <div>
                <h2 className="mb-xs font-h3 text-h3 text-on-surface">{p.title}</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">{p.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-xl rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <p className="font-body-sm text-body-sm text-secondary">
            Questions about our security posture for a vendor review? Reach out at{" "}
            <a href="mailto:security@envsync.io" className="text-primary hover:underline">
              security@envsync.io
            </a>
            .
          </p>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
