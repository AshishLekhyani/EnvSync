"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const ENVS = [
  { id: "production", label: "Production", icon: "rocket_launch" },
  { id: "staging", label: "Staging", icon: "swipe_left" },
  { id: "development", label: "Development", icon: "code" },
] as const;

export function SideNav({
  activeEnv = "production",
}: {
  activeEnv?: "production" | "staging" | "development";
}) {
  const pathname = usePathname();
  // Settings page highlights Development in the design
  const env =
    pathname.startsWith("/settings") ? "development" : activeEnv;

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col gap-base border-r border-outline-variant bg-surface-container-low p-md md:flex">
      <div className="mb-md flex items-center gap-md px-md py-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary">
          <Icon name="security" style={{ fontSize: 18 }} />
        </div>
        <div>
          <div className="font-label-md text-label-md font-bold leading-none text-on-surface">
            Core API
          </div>
          <div className="mt-xs font-body-sm text-[10px] uppercase tracking-wider text-on-surface-variant">
            V1
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-xs">
        {ENVS.map((item) => {
          const active = item.id === env;
          return (
            <Link
              key={item.id}
              href="/environment"
              className={
                active
                  ? "flex cursor-pointer items-center gap-md rounded-lg bg-primary-container px-md py-sm text-on-primary-container shadow-sm duration-150 active:scale-95"
                  : "flex cursor-pointer items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high active:scale-95"
              }
            >
              <Icon name={item.icon} />
              <span className="font-label-md text-label-md">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        className="mx-md mt-md flex items-center justify-center gap-xs rounded-lg border border-primary bg-primary-container py-sm font-label-md text-label-md text-on-primary-container transition-all hover:brightness-110"
      >
        <Icon name="add" style={{ fontSize: 18 }} />
        New Environment
      </button>

      <div className="mt-auto flex flex-col gap-xs border-t border-outline-variant pt-md">
        <a
          href="#"
          className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="description" />
          <span className="font-label-md text-label-md">Docs</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <Icon name="contact_support" />
          <span className="font-label-md text-label-md">Support</span>
        </a>
      </div>
    </aside>
  );
}
