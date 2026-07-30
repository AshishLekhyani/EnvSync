import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export const metadata = { title: "Terms of Service — EnvSync" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-h1 text-on-surface">Terms of Service</h1>
        <p className="mb-xl font-body-sm text-body-sm text-secondary">Last updated: March 2026</p>

        <div className="flex flex-col gap-lg font-body-md text-body-md text-secondary">
          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Using EnvSync</h2>
            <p>
              By creating an account, you agree to use EnvSync only for lawful purposes and in
              a way that doesn&apos;t infringe on the rights of others or restrict anyone
              else&apos;s use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Your account</h2>
            <p>
              You&apos;re responsible for the security of your account credentials and for all
              activity that happens under it, including through service tokens you generate.
              Tell us right away if you suspect unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Your data</h2>
            <p>
              You retain ownership of the organizations, projects, and secrets you create.
              We don&apos;t claim any rights to their contents beyond what&apos;s needed to
              operate the service — encrypting, storing, and serving them back to authorized
              members of your organization.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Service availability</h2>
            <p>
              We aim for high availability but don&apos;t guarantee the service will be
              uninterrupted or error-free. We&apos;ll do our best to give notice ahead of any
              planned downtime that could affect you.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Termination</h2>
            <p>
              You can delete your account or organization at any time. We may suspend accounts
              that violate these terms or that we reasonably believe pose a security risk to
              other users.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Changes to these terms</h2>
            <p>
              We&apos;ll update the date at the top of this page whenever these terms change
              materially, and do our best to give advance notice of any significant change.
            </p>
          </section>

          <section>
            <h2 className="mb-xs font-h3 text-h3 text-on-surface">Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href="mailto:legal@envsync.io" className="text-primary hover:underline">
                legal@envsync.io
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
