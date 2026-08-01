import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "API Tokens — EnvSync Docs" };

export default function ApiTokensDocsPage() {
  return (
    <DocsShell>
      <p className="mb-xs font-label-md text-label-md uppercase tracking-wider text-primary">
        Docs
      </p>
      <h1 className="mb-md font-h1 text-h1 text-on-surface">API Tokens</h1>
      <p className="mb-xl font-body-lg text-body-lg text-secondary">
        How service tokens work, and how they're scoped.
      </p>

      <div className="flex flex-col gap-lg">
        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Creating a token</h2>
          <p className="font-body-md text-body-md text-secondary">
            From Settings → CLI &amp; Tokens, any org member can generate a token for their own
            use — since it can only ever act as its creator, there&apos;s no elevated-access risk
            in letting anyone self-serve one. Give it a descriptive name; the raw token value is
            shown exactly once — copy it immediately, it can&apos;t be retrieved again. Only its
            SHA-256 hash is ever stored. Non-owners only see and manage their own tokens; the
            Owner can see and revoke every token in the org.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Identity-inheriting, not independent</h2>
          <p className="font-body-md text-body-md text-secondary">
            A token isn&apos;t a separately-configured credential — it acts as its creator, with
            their live project access evaluated fresh on every request. If that person&apos;s
            access to a project changes or they leave the organization, every token they created
            is affected identically and immediately.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Hard-scoped to one organization</h2>
          <p className="font-body-md text-body-md text-secondary">
            A token minted for one organization is rejected against every other organization
            its creator belongs to, even though the creator&apos;s own login works everywhere
            they&apos;re a member. This means a leaked CI/CD token has single-org blast radius,
            not account-wide blast radius.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Revoking a token</h2>
          <p className="font-body-md text-body-md text-secondary">
            Revocation is immediate and irreversible — a revoked token is rejected on its very
            next use. Revoked tokens stay listed (with a Revoked badge) rather than
            disappearing, so there's a durable record of every credential that ever existed.
          </p>
        </section>
      </div>
    </DocsShell>
  );
}
