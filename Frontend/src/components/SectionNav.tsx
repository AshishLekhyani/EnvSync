"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { SidebarFooterLinks } from "./sidebars/SidebarFooterLinks";

export interface SectionNavItem {
  href: string;
  label: string;
  icon: string;
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-xs border-r border-outline-variant bg-surface-container-low p-md md:flex">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex items-center gap-md rounded-lg bg-primary-container px-md py-sm text-on-primary-container shadow-sm duration-150 active:scale-95"
                  : "flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high active:scale-95"
              }
            >
              <Icon name={item.icon} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          );
        })}
        <SidebarFooterLinks />
      </aside>

      <nav className="flex gap-xs overflow-x-auto border-b border-outline-variant bg-surface px-md py-sm md:hidden">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "flex flex-shrink-0 items-center gap-xs rounded-lg bg-primary-container px-md py-sm text-on-primary-container"
                  : "flex flex-shrink-0 items-center gap-xs rounded-lg px-md py-sm text-on-surface-variant"
              }
            >
              <Icon name={item.icon} style={{ fontSize: 18 }} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
