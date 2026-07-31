import { DocsShell } from "@/components/DocsShell";

export const metadata = { title: "Security & Encryption — EnvSync Docs" };

export default function SecurityDocsPage() {
  return (
    <DocsShell>
      <p className="mb-xs font-label-md text-label-md uppercase tracking-wider text-primary">
        Docs
      </p>
      <h1 className="mb-md font-h1 text-h1 text-on-surface">Security &amp; Encryption</h1>
      <p className="mb-xl font-body-lg text-body-lg text-secondary">
        This page describes how EnvSync actually encrypts and protects data — not marketing
        language, the real design.
      </p>

      <div className="flex flex-col gap-lg">
        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Envelope encryption</h2>
          <p className="mb-sm font-body-md text-body-md text-secondary">
            Every secret value is encrypted with <strong>AES-256-GCM</strong> — an authenticated
            cipher, so tampering with ciphertext is detectable, not just confidentiality. Each
            organization has its own 256-bit Data Encryption Key (DEK), generated once and
            wrapped (encrypted) by a single server-held master key. Secret values are encrypted
            with the org&apos;s DEK, never directly with the master key — the master key&apos;s
            only job is wrapping and unwrapping DEKs. This means rotating the master key never
            requires re-encrypting every secret in the database, only re-wrapping DEKs.
          </p>
          <p className="font-body-md text-body-md text-secondary">
            This is server-side encryption, not zero-knowledge — the server can decrypt secrets
            to serve them to authorized users after an RBAC check. A DEK is never cached
            unwrapped in memory between requests; it&apos;s unwrapped fresh each time it&apos;s
            needed.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Passwords &amp; sessions</h2>
          <p className="mb-sm font-body-md text-body-md text-secondary">
            Passwords are hashed with <strong>argon2id</strong>, the current OWASP-recommended
            algorithm, with explicit cost parameters pinned in code so a library upgrade
            can&apos;t silently change the security posture.
          </p>
          <p className="font-body-md text-body-md text-secondary">
            Authentication uses short-lived JWT access tokens (HS256, algorithm pinned
            explicitly) plus a separate, opaque refresh token stored as an httpOnly cookie.
            Only the refresh token&apos;s SHA-256 hash is ever stored server-side — the raw
            value never touches the database. Refresh tokens rotate on every use: using one
            revokes it and issues a new one, bounding the damage from a leaked token.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Access control</h2>
          <p className="mb-sm font-body-md text-body-md text-secondary">
            Every request — whether authenticated by a browser session or a CLI service
            token — passes through the same role-based access control path. See{" "}
            <a href="/docs/permissions" className="text-primary hover:underline">
              Roles &amp; Permissions
            </a>{" "}
            for the full model. Service tokens are hard-scoped to the org they were issued in:
            a token minted for one organization is rejected outright against any other
            organization, even if its creator belongs to both.
          </p>
          <p className="font-body-md text-body-md text-secondary">
            A service token is also identity-inheriting, not independently scoped: it can only
            ever do what its creator can do, checked fresh on every call. If a member doesn&apos;t
            have access to a given project — because they were never granted it, or because
            they only have org-wide visibility without project access — a CLI command against
            that project&apos;s environments is rejected the same way it would be in the browser,
            not just hidden from a menu.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Rate limiting &amp; headers</h2>
          <p className="font-body-md text-body-md text-secondary">
            Login and signup are rate-limited per IP+email to blunt brute-force and
            credential-stuffing attempts without locking out a whole shared office IP. A
            generous global rate limit covers the rest of the API. Every response carries a
            standard set of security headers (via Helmet on the API, and equivalent headers on
            the web app) — strict content-type sniffing protection, clickjacking protection, and
            a Content-Security-Policy in production.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Audit logging</h2>
          <p className="mb-sm font-body-md text-body-md text-secondary">
            Every mutating action — and every secret reveal — writes an audit log row: who,
            what, when, and from where. Revealing a secret is always freshly audited, even if
            you revealed the same value moments earlier; nothing about a reveal is cached
            client-side to avoid a stale plaintext value sitting in memory unaudited. This
            applies identically whether the action came from the browser or the CLI — both go
            through the same service functions, so a{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">pull</code>{" "}
            or{" "}
            <code className="rounded bg-surface-container px-1 font-code-sm text-code-sm">push</code>{" "}
            leaves the same trail a manual reveal or edit would.
          </p>
          <p className="font-body-md text-body-md text-secondary">
            Logs are append-only in normal use. The Owner can permanently delete entries older
            than a chosen date from Settings → Organization, for orgs that need to manage log
            retention — that action is itself logged.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Profile photos</h2>
          <p className="font-body-md text-body-md text-secondary">
            A profile photo is validated server-side before it&apos;s stored — its actual bytes
            are checked against the image format it claims to be, not just trusted from the
            upload&apos;s declared type, and it&apos;s size-capped well under the API&apos;s
            request-body limit.
          </p>
        </section>

        <section>
          <h2 className="mb-sm font-h3 text-h3 text-on-surface">Real-time session control</h2>
          <p className="font-body-md text-body-md text-secondary">
            Revoking a session — from Settings, or automatically on a password change — takes
            effect immediately, not on the affected device&apos;s next reload. A live event
            channel notifies connected sessions the moment one of them is revoked.
          </p>
        </section>
      </div>
    </DocsShell>
  );
}
