import Link from "next/link";
import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "Getting Started — EnvSync Docs" };

export default function GettingStartedDocsPage() {
  return (
    <DocsShell>
      <p className="mb-xs font-label-md text-label-md uppercase tracking-wider text-primary">
        Docs
      </p>
      <h1 className="mb-md font-h1 text-h1 text-on-surface">Getting Started</h1>
      <p className="mb-xl font-body-lg text-body-lg text-secondary">
        Everything you need to go from a fresh account to your first CLI pull.
      </p>

      <div className="flex flex-col gap-lg">
        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">1. Create an account</h2>
          <p className="font-body-md text-body-md text-secondary">
            Sign up with an email and password, or use Google if your server has OAuth
            configured. For password signup, your account isn&apos;t created until you click the
            verification link sent to your email — this prevents anyone from signing up with an
            email they don&apos;t own. There&apos;s nothing to install for the web app — it runs
            entirely in the browser.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">2. Create an organization</h2>
          <p className="font-body-md text-body-md text-secondary">
            Organizations are the top-level container for your team. The account that creates
            one automatically becomes its <strong>Owner</strong>. You can belong to and switch
            between multiple organizations from the switcher in the top navigation bar.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">3. Create a project</h2>
          <p className="font-body-md text-body-md text-secondary">
            Projects group related environments together — typically one project per
            application or service.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">4. Add an environment</h2>
          <p className="font-body-md text-body-md text-secondary">
            Every project can have up to four environment tiers: <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">Development</code>,{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">Testing</code>,{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">Staging</code>, and{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">Production</code>. Each tier
            has its own secrets and its own access rules — see{" "}
            <Link href="/docs/permissions" className="text-primary hover:underline">
              Roles &amp; Permissions
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">5. Add a secret</h2>
          <p className="font-body-md text-body-md text-secondary">
            Add a key/value pair from the environment page. Values are encrypted before they
            ever hit the database — see{" "}
            <Link href="/docs/security" className="text-primary hover:underline">
              Security &amp; Encryption
            </Link>{" "}
            for exactly how.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">6. Install the CLI</h2>
          <div className="overflow-hidden rounded-lg border border-[#30363D]">
            <div className="code-block-body p-md">
              <code className="font-code-md text-code-md text-[#E6EDF3]">
                <span className="text-[#FF7B72]">npm</span> install -g envsync-cli
              </code>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">7. Log in and pull</h2>
          <p className="mb-sm font-body-md text-body-md text-secondary">
            Generate a service token from Settings → CLI &amp; Tokens, then:
          </p>
          <div className="overflow-hidden rounded-lg border border-[#30363D]">
            <div className="code-block-body space-y-xs p-md">
              <code className="block font-code-md text-code-md text-[#E6EDF3]">
                <span className="text-[#FF7B72]">envsync</span> login{" "}
                <span className="text-[#79C0FF]">&lt;your-token&gt;</span>
              </code>
              <code className="block font-code-md text-code-md text-[#E6EDF3]">
                <span className="text-[#FF7B72]">envsync</span> pull --project{" "}
                <span className="text-[#79C0FF]">&lt;id&gt;</span> --environment{" "}
                <span className="text-[#79C0FF]">&lt;id&gt;</span>
              </code>
            </div>
          </div>
          <p className="mt-sm font-body-md text-body-md text-secondary">
            That writes a real <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">.env</code> file to your working
            directory. See the full{" "}
            <Link href="/docs/cli" className="text-primary hover:underline">
              CLI Reference
            </Link>{" "}
            for every command.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">8. Invite your team</h2>
          <p className="font-body-md text-body-md text-secondary">
            From Team → Invites, generate a shareable invite link scoped to a role and,
            optionally, a specific project. Invites created by a Developer need Admin approval
            before they&apos;re usable — see{" "}
            <Link href="/docs/permissions" className="text-primary hover:underline">
              Roles &amp; Permissions
            </Link>{" "}
            for the full hierarchy. Anyone can leave an organization or a project on their own
            from Settings, no admin required.
          </p>
        </section>
      </div>
    </DocsShell>
  );
}
