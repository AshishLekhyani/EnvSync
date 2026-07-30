import Link from "next/link";
import { Icon } from "./Icon";

const COLUMNS = [
  {
    title: "Product",
    items: [
      { label: "Changelog", href: "/changelog" },
      { label: "Documentation", href: "/docs" },
      { label: "CLI Reference", href: "/docs/cli" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Customers", href: "/customers" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Trust Center", href: "/trust" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security Portal", href: "/trust" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low py-xl">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-xl px-margin-mobile md:grid-cols-4 md:px-margin-desktop lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="mb-md block font-h3 text-h3 font-black text-primary">
            EnvSync
          </Link>
          <p className="mb-md font-body-sm text-body-sm text-secondary">
            The modern standard for secret management and environment syncing.
          </p>
          <div className="flex gap-md">
            <Icon name="public" className="text-outline" />
            <Icon name="groups" className="text-outline" />
            <Icon name="hub" className="text-outline" />
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-md font-label-md text-label-md text-on-surface">{col.title}</h4>
            <ul className="space-y-sm font-body-sm text-body-sm text-secondary">
              {col.items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-xl max-w-[1280px] border-t border-outline-variant px-margin-mobile pt-lg text-center md:px-margin-desktop md:text-left">
        <p className="font-body-sm text-body-sm text-outline">
          © 2026 EnvSync Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
