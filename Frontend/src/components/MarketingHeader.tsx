import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#cli", label: "CLI" },
  { href: "#security", label: "Security" },
  { href: "#docs", label: "Docs" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/95 px-xl backdrop-blur-sm">
      <div className="flex items-center gap-xl">
        <Link href="/" className="font-h2 text-h2 font-black text-primary">
          EnvSync
        </Link>
        <nav className="hidden items-center gap-lg md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body-md text-body-md text-secondary transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-sm md:gap-md">
        <ThemeToggle />
        <Link
          href="/login"
          className="px-md py-sm font-label-md text-label-md text-secondary transition-colors hover:text-primary"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
