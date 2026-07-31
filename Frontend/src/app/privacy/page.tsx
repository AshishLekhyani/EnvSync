import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = { title: "Privacy Policy — EnvSync" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-h1 text-on-surface">Privacy Policy</h1>
        <p className="mb-xl font-body-sm text-body-sm text-secondary">Last updated: March 2026</p>

        <div className="flex flex-col gap-lg font-body-md text-body-md text-secondary">
          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Information we collect</h2>
            <p>
              We collect the account information you provide directly — name, email address, and
              password (stored only as a salted hash, never in plain text). If you sign in with
              Google, we receive your name, email, and account identifier from that provider.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">How we use it</h2>
            <p>
              Account information is used to operate your account: authentication,
              organization membership, audit trail attribution, and product communications
              you&apos;ve opted into. We do not sell personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Secret values</h2>
            <p>
              Environment variable values you store are encrypted at rest and are never used
              for any purpose other than serving them back to authorized members of your
              organization. See our{" "}
              <a href="/trust" className="text-primary hover:underline">
                Trust Center
              </a>{" "}
              for the technical detail.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Data retention</h2>
            <p>
              Account and secret data is retained for as long as your account is active.
              Deleting an organization permanently removes its projects, environments, and
              secrets; an audit trail of the deletion itself is retained for forensic purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Your rights</h2>
            <p>
              You can update or delete your account information at any time from Settings. To
              request a full data export or deletion beyond what&apos;s self-service, contact{" "}
              <a href="mailto:privacy@envsync.io" className="text-primary hover:underline">
                privacy@envsync.io
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Changes to this policy</h2>
            <p>
              We&apos;ll update the date at the top of this page whenever this policy changes
              materially.
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
