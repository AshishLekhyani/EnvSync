import Link from "next/link";
import { GuestOnly } from "@/components/GuestOnly";
import { MarketingFooter } from "@/components/MarketingFooter";
import { MarketingHeader } from "@/components/MarketingHeader";
import { Icon } from "@/components/Icon";

const secrets = [
  { key: "DATABASE_URL", value: "••••••••••••••••••••••••" },
  { key: "STRIPE_SECRET", value: "••••••••••••••••••••••••" },
  { key: "AWS_ACCESS_KEY", value: "AKIA292X88..." },
];

export default function LandingPage() {
  return (
    <GuestOnly>
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />

      <main className="mx-auto max-w-[1280px] overflow-x-hidden px-margin-mobile py-xl md:px-margin-desktop">
        {/* Hero */}
        <section className="hero-gradient relative flex flex-col items-center py-xl text-center md:py-32">
          <div className="max-w-3xl">
            <h1 className="mb-md font-h1 text-[48px] leading-tight text-on-surface md:text-[64px]">
              Stop sharing .env files in{" "}
              <span className="text-primary-container">Slack.</span>
            </h1>
            <p className="mx-auto mb-xl max-w-2xl font-body-lg text-body-lg text-secondary">
              The secure vault for team environment variables. Sync encrypted
              secrets across your entire stack with a lightweight CLI. No more
              plain-text leaks.
            </p>
            <div className="flex flex-col items-center justify-center gap-md sm:flex-row">
              <Link
                href="/signup"
                className="rounded-lg bg-primary-container px-xl py-md font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
              >
                Get Started for Free
              </Link>
              <Link
                href="/docs"
                className="rounded-lg border border-outline-variant bg-surface-container-low px-xl py-md font-label-md text-label-md text-on-surface transition-all hover:bg-surface-container-high"
              >
                View the Docs
              </Link>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative mt-24 w-full max-w-5xl">
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest shadow-2xl">
              <div className="flex h-10 items-center gap-sm border-b border-outline-variant bg-surface-container px-md">
                <div className="h-3 w-3 rounded-full bg-error/40" />
                <div className="h-3 w-3 rounded-full bg-primary/40" />
                <div className="h-3 w-3 rounded-full bg-tertiary/40" />
                <div className="ml-auto flex items-center gap-xs">
                  <div className="rounded bg-surface-container-highest px-sm py-1 font-mono text-[10px] text-secondary">
                    envsync.app
                  </div>
                </div>
              </div>
              <div className="flex gap-lg p-md">
                <div className="hidden w-48 border-r border-outline-variant pr-md md:block">
                  <div className="space-y-sm">
                    <div className="flex items-center gap-xs rounded-lg bg-primary-container/10 p-sm font-label-md text-label-md text-primary-container">
                      <Icon name="rocket_launch" style={{ fontSize: 18 }} />{" "}
                      Production
                    </div>
                    <div className="flex items-center gap-xs rounded-lg p-sm font-label-md text-label-md text-secondary transition-colors hover:bg-surface-container">
                      <Icon name="swipe_left" style={{ fontSize: 18 }} /> Staging
                    </div>
                    <div className="flex items-center gap-xs rounded-lg p-sm font-label-md text-label-md text-secondary transition-colors hover:bg-surface-container">
                      <Icon name="code" style={{ fontSize: 18 }} /> Development
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="mb-md flex items-center justify-between">
                    <h3 className="font-h3 text-h3 text-on-surface">
                      Production Secrets
                    </h3>
                    <div className="flex gap-sm">
                      <span className="flex items-center gap-1 rounded-full bg-on-error-container/10 px-sm py-1 text-[11px] font-bold text-error">
                        <Icon
                          name="lock"
                          filled
                          style={{
                            fontSize: 14,
                            fontVariationSettings: "'FILL' 1",
                          }}
                        />{" "}
                        AES-256
                      </span>
                      <button
                        type="button"
                        className="rounded bg-primary-container px-sm py-1 text-[12px] font-bold text-white"
                      >
                        + Add Variable
                      </button>
                    </div>
                  </div>
                  <div className="space-y-xs">
                    {secrets.map((row) => (
                      <div
                        key={row.key}
                        className="group flex items-center justify-between rounded-lg border border-transparent p-sm transition-colors hover:border-outline-variant hover:bg-surface-container-low"
                      >
                        <div className="flex items-center gap-md">
                          <span className="font-code-md text-code-md font-bold text-on-surface">
                            {row.key}
                          </span>
                          <span className="text-xs text-outline">{row.value}</span>
                        </div>
                        <div className="flex gap-sm opacity-0 transition-opacity group-hover:opacity-100">
                          <Icon
                            name="visibility"
                            className="cursor-pointer text-secondary"
                            style={{ fontSize: 18 }}
                          />
                          <Icon
                            name="content_copy"
                            className="cursor-pointer text-secondary"
                            style={{ fontSize: 18 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-12 -top-12 -z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 -z-10 h-64 w-64 rounded-full bg-tertiary/5 blur-3xl" />
          </div>
        </section>

        {/* Trusted by */}
        <section className="mt-24 overflow-hidden border-y border-outline-variant py-xl">
          <p className="mb-lg text-center font-label-md text-label-md uppercase tracking-widest text-secondary">
            Trusted by modern engineering teams
          </p>
          <div className="flex flex-wrap items-center justify-center gap-xl opacity-60 grayscale transition-all duration-500 hover:grayscale-0">
            {["QUANTUM", "CYBER_DYNE", "VOID_TECH", "NEXUS_OS", "SPECTER"].map(
              (name) => (
                <div
                  key={name}
                  className="flex h-8 w-32 items-center justify-center text-xl font-black text-on-surface"
                >
                  {name}
                </div>
              )
            )}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-24 py-xl">
          <div id="security" className="mb-xl scroll-mt-24 text-center">
            <h2 className="mb-sm font-h1 text-h1 text-on-surface">
              Infrastructure-grade security
            </h2>
            <p className="mx-auto max-w-xl font-body-md text-body-md text-secondary">
              Built for compliance-heavy environments where security isn&apos;t
              optional.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
            {[
              {
                icon: "enhanced_encryption",
                iconWrap: "bg-primary/10",
                iconColor: "text-primary",
                title: "AES-256 Encryption",
                body: "All secrets are encrypted client-side before they ever touch our servers. Zero-knowledge by design.",
                cta: "Technical details",
              },
              {
                icon: "admin_panel_settings",
                iconWrap: "bg-tertiary/10",
                iconColor: "text-tertiary",
                title: "RBAC & Audit Logs",
                body: "Control exactly who can view or edit secrets. Full immutable audit trail for compliance (SOC2/GDPR).",
                cta: "Compliance guide",
              },
              {
                icon: "hub",
                iconWrap: "bg-on-surface-variant/10",
                iconColor: "text-on-surface-variant",
                title: "Native Integrations",
                body: "One-click sync with GitHub Actions, Vercel, AWS Secrets Manager, and Docker containers.",
                cta: "Explore integrations",
                href: "/integrations",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bento-card flex flex-col gap-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-lg"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.iconWrap}`}
                >
                  <Icon
                    name={card.icon}
                    className={card.iconColor}
                    filled
                    style={{
                      fontSize: 28,
                      fontVariationSettings: "'FILL' 1",
                    }}
                  />
                </div>
                <div>
                  <h3 className="mb-xs font-h3 text-h3 text-on-surface">
                    {card.title}
                  </h3>
                  <p className="font-body-md text-body-md text-secondary">
                    {card.body}
                  </p>
                </div>
                <div className="mt-auto border-t border-outline-variant pt-md">
                  {"href" in card && card.href ? (
                    <Link
                      href={card.href}
                      className="flex items-center gap-xs font-label-md text-label-md text-primary hover:underline"
                    >
                      {card.cta}{" "}
                      <Icon name="arrow_forward" style={{ fontSize: 16 }} />
                    </Link>
                  ) : (
                    <span
                      className="flex cursor-not-allowed items-center gap-xs font-label-md text-label-md text-secondary opacity-60"
                      title="Coming soon"
                    >
                      {card.cta}{" "}
                      <Icon name="arrow_forward" style={{ fontSize: 16 }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CLI */}
        <section
          id="cli"
          className="relative mt-24 scroll-mt-24 overflow-hidden rounded-3xl bg-inverse-surface py-xl"
        >
          <div className="grid grid-cols-1 items-center gap-xl px-xl py-xl md:grid-cols-2">
            <div>
              <h2 className="mb-md font-h1 text-[32px] text-inverse-on-surface">
                Built for Developers
              </h2>
              <p className="mb-lg font-body-lg text-body-lg text-surface-dim">
                Forget manual copy-pasting. Use our lightweight CLI to inject
                secrets directly into your development processes or CI/CD
                pipelines.
              </p>
              <ul className="mb-xl space-y-sm">
                {[
                  "No more stale .env files",
                  "Environment switching in seconds",
                  "Encrypted local storage",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-sm text-surface-container-lowest"
                  >
                    <Icon name="check_circle" className="text-primary-container" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="inline-block rounded-lg bg-primary-container px-lg py-md font-bold text-white"
              >
                Install CLI
              </Link>
            </div>

            <div className="terminal-window overflow-hidden rounded-xl border border-white/10 bg-[#0D1117] font-code-md text-code-md">
              <div className="flex items-center justify-between bg-white/5 px-md py-sm">
                <div className="flex gap-xs">
                  <div className="h-3 w-3 rounded-full bg-red-500/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/50" />
                </div>
                <span className="text-[10px] uppercase tracking-widest text-white/30">
                  zsh
                </span>
              </div>
              <div className="space-y-md p-lg">
                <div className="flex gap-sm">
                  <span className="text-green-400">~</span>
                  <span className="text-white">envsync pull production</span>
                </div>
                <div className="text-white/40">
                  Checking authentication...{" "}
                  <span className="text-green-400">Done</span>
                  <br />
                  Fetching environment:{" "}
                  <span className="text-primary-container">
                    core-api/production
                  </span>
                  <br />
                  Decrypting 24 secrets...
                </div>
                <div className="rounded border border-green-400/20 bg-green-400/10 p-sm text-green-400">
                  SUCCESS: Environment synced to .env.envsync
                  <br />
                  Run &apos;envsync run npm start&apos; to use.
                </div>
                <div className="flex gap-sm">
                  <span className="text-green-400">~</span>
                  <span className="block h-4 w-2 animate-pulse bg-white/60" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-md font-h1 text-[40px] text-on-surface">
              Ready to secure your stack?
            </h2>
            <p className="mb-xl font-body-lg text-body-lg text-secondary">
              Start securing your environment variables the right way. Free tier available — no credit card required.
            </p>
            <div className="flex flex-col justify-center gap-md sm:flex-row">
              <Link
                href="/signup"
                className="rounded-lg bg-primary-container px-xl py-md font-bold text-white shadow-lg transition-all hover:shadow-primary/20"
              >
                Get Started for Free
              </Link>
              <a
                href="mailto:sales@envsync.io"
                className="rounded-lg border border-outline-variant bg-white dark:bg-surface-container-lowest px-xl py-md font-bold text-on-surface transition-all hover:bg-surface-container"
              >
                Talk to Sales
              </a>
            </div>
            <p className="mt-lg font-body-sm text-body-sm text-outline">
              Built for teams that take secrets seriously.
            </p>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
    </GuestOnly>
  );
}
