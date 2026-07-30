"use client";

import Link from "next/link";
import { SectionNav } from "./SectionNav";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth-context";

const DOCS_NAV = [
  { href: "/docs/getting-started", label: "Getting Started", icon: "rocket_launch" },
  { href: "/docs/cli", label: "CLI Reference", icon: "terminal" },
  { href: "/docs/security", label: "Security & Encryption", icon: "enhanced_encryption" },
  { href: "/docs/permissions", label: "Roles & Permissions", icon: "admin_panel_settings" },
  { href: "/docs/integrations", label: "Integrations", icon: "hub" },
  { href: "/docs/api-tokens", label: "API Tokens", icon: "key" },
];

export function DocsShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-xl">
        <Link href="/" className="font-h2 text-h2 font-black text-primary">
          EnvSync
        </Link>
        <div className="flex items-center gap-md">
          <ThemeToggle />
          <Link
            href={user ? "/projects" : "/login"}
            className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90"
          >
            {user ? "Go to Dashboard" : "Log in"}
          </Link>
        </div>
      </header>

      <SectionNav items={DOCS_NAV} />

      <div className="md:ml-64">
        <main className="mx-auto max-w-3xl px-margin-mobile py-xl md:px-xl">{children}</main>
      </div>
    </div>
  );
}
