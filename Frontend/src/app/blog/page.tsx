import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Blog — EnvSync" };

const POSTS = [
  {
    title: "Introducing EnvSync",
    date: "March 2026",
    excerpt:
      "Why we built another secrets manager: most teams don't need zero-knowledge encryption and a six-figure compliance package, they need their .env files out of Slack. Here's the shape of what we shipped.",
  },
  {
    title: "Envelope encryption, explained without the jargon",
    date: "April 2026",
    excerpt:
      "A per-org data key wrapped by a master key sounds complicated until you draw it out. Here's why we picked this design over encrypting every secret directly with one shared key.",
  },
  {
    title: "RBAC that actually matches how teams work",
    date: "May 2026",
    excerpt:
      "Most permission systems either give you three roles and no flexibility, or a rules engine nobody wants to configure. We landed on sane defaults plus an editable matrix — here's why.",
  },
  {
    title: "What 'zero external dependencies' buys you in a CLI",
    date: "June 2026",
    excerpt:
      "Our CLI ships with no npm dependencies at all — just Node's built-ins. That's a smaller supply-chain surface for a tool that holds decrypted secrets in memory. Worth the extra code.",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-margin-mobile py-32 md:px-margin-desktop">
        <h1 className="mb-md font-h1 text-[40px] text-on-surface">Blog</h1>
        <p className="mb-xl font-body-lg text-body-lg text-secondary">
          Notes on building EnvSync — security decisions, product tradeoffs, and the
          occasional post-mortem.
        </p>

        <div className="flex flex-col divide-y divide-outline-variant rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest">
          {POSTS.map((post) => (
            <article key={post.title} className="p-lg">
              <div className="mb-xs flex items-center gap-sm">
                <Icon name="article" className="text-primary" style={{ fontSize: 18 }} />
                <span className="font-body-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                  {post.date}
                </span>
              </div>
              <h2 className="mb-xs font-h3 text-h3 text-on-surface">{post.title}</h2>
              <p className="font-body-md text-body-md text-secondary">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
