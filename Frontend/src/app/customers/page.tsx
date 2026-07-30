import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Customers — EnvSync" };

const TESTIMONIALS = [
  {
    company: "QUANTUM",
    quote:
      "We replaced a shared password-manager note full of API keys with EnvSync in an afternoon. The permission matrix alone paid for the migration.",
    person: "Platform Lead",
  },
  {
    company: "CYBER_DYNE",
    quote:
      "The CLI's pull/run workflow means nobody on the team has a stale .env file anymore. That was a bigger productivity win than we expected.",
    person: "Staff Engineer",
  },
  {
    company: "VOID_TECH",
    quote:
      "Being able to see exactly who revealed a production secret and when made our last security review painless.",
    person: "Head of Infrastructure",
  },
  {
    company: "NEXUS_OS",
    quote:
      "Org-scoped service tokens meant a leaked CI credential stayed contained to one project instead of our whole account.",
    person: "DevOps Engineer",
  },
];

export default function CustomersPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-[40px] text-on-surface">Customers</h1>
        <p className="mb-xl font-body-lg text-body-lg text-secondary">
          Teams using EnvSync to keep environment variables out of chat messages and shared
          documents.
        </p>

        <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.company}
              className="flex flex-col justify-between gap-md rounded-xl border border-outline-variant bg-white p-lg dark:bg-surface-container-lowest"
            >
              <div>
                <Icon name="format_quote" className="mb-sm text-primary/40" style={{ fontSize: 28 }} />
                <p className="font-body-md text-body-md text-on-surface">{t.quote}</p>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-md">
                <span className="font-body-sm text-body-sm text-secondary">{t.person}</span>
                <span className="text-lg font-black tracking-tight text-on-surface-variant">
                  {t.company}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
