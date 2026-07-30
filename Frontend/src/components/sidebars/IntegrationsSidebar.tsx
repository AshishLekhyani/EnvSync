import { Icon } from "../Icon";

const ITEMS = [
  { href: "#github-actions", label: "GitHub Actions", icon: "hub" },
  { href: "#docker", label: "Docker", icon: "deployed_code" },
  { href: "#vercel", label: "Vercel", icon: "bolt" },
  { href: "#aws", label: "AWS Secrets Manager", icon: "lock" },
];

export function IntegrationsSidebar() {
  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-xs border-r border-outline-variant bg-surface-container-low p-md md:flex">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <Icon name={item.icon} />
            <span className="font-label-md text-label-md">{item.label}</span>
          </a>
        ))}
      </aside>

      <nav className="flex gap-xs overflow-x-auto border-b border-outline-variant bg-surface px-md py-sm md:hidden">
        {ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-shrink-0 items-center gap-xs rounded-lg px-md py-sm text-on-surface-variant"
          >
            <Icon name={item.icon} style={{ fontSize: 18 }} />
            <span className="font-label-md text-label-md">{item.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}
