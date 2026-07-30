import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "About — EnvSync" };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-[40px] text-on-surface">About EnvSync</h1>
        <p className="mb-xl font-body-lg text-body-lg text-secondary">
          We started EnvSync because sharing secrets in Slack messages and copy-pasted
          <code className="mx-1 rounded bg-surface-container px-1 font-code-sm text-code-sm">
            .env
          </code>
          files was the norm on every team we&apos;d worked on — and every one of those teams
          had a story about a leaked key that shouldn&apos;t have gone where it went.
        </p>

        <div className="mb-xl grid grid-cols-1 gap-lg md:grid-cols-3">
          {[
            {
              icon: "enhanced_encryption",
              title: "Security first",
              body: "Every secret is encrypted at rest with AES-256-GCM before it's ever written to disk. No exceptions, no shortcuts.",
            },
            {
              icon: "bolt",
              title: "Built for developers",
              body: "A CLI with zero runtime dependencies, real audit logs, and a permission model that maps to how teams actually work.",
            },
            {
              icon: "visibility_off",
              title: "Nothing hidden",
              body: "If a feature isn't built yet, we say so. We'd rather ship something real later than fake it now.",
            },
          ].map((v) => (
            <div key={v.title} className="rounded-xl border border-outline-variant bg-white p-md dark:bg-surface-container-lowest">
              <Icon name={v.icon} className="mb-sm text-primary" style={{ fontSize: 28 }} />
              <h3 className="mb-xs font-h3 text-h3 text-on-surface">{v.title}</h3>
              <p className="font-body-sm text-body-sm text-secondary">{v.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-sm font-h2 text-h2 text-on-surface">Where we are today</h2>
        <p className="font-body-md text-body-md text-secondary">
          EnvSync is early — small team, moving fast, building the core product in the open.
          If you hit something broken or missing, that&apos;s useful signal, not a surprise.
          See the{" "}
          <a href="/changelog" className="text-primary hover:underline">
            changelog
          </a>{" "}
          for what&apos;s actually shipped so far.
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
