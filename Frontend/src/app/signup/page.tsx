import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen bg-[#F6F8FA] dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <ThemeToggle className="fixed right-md top-md z-50 bg-surface-container-low shadow-sm" />
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-inverse-surface p-xl lg:flex">
        <Link href="/" className="font-h2 text-h2 font-black text-primary-fixed-dim">
          EnvSync
        </Link>
        <div className="relative z-10 max-w-md">
          <div className="mb-md flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container/20">
            <Icon name="group_add" className="text-primary-container" filled />
          </div>
          <h2 className="mb-md font-h1 text-h1 text-inverse-on-surface">
            Get your team out of Slack .env chaos.
          </h2>
          <ul className="space-y-sm font-body-md text-body-md text-surface-dim">
            {[
              "Email/password or GitHub OAuth",
              "Organizations, roles, and project vaults",
              "CLI pull/push for local builds",
            ].map((item) => (
              <li key={item} className="flex items-center gap-sm">
                <Icon name="check_circle" className="text-primary-container" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 font-body-sm text-body-sm text-surface-dim">
          Free tier available. No credit card required.
        </p>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-container/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-tertiary/10 blur-3xl" />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-margin-mobile py-xl lg:w-1/2 md:px-xl">
        <div className="mb-lg w-full max-w-md lg:hidden">
          <Link href="/" className="font-h2 text-h2 font-black text-primary">
            EnvSync
          </Link>
        </div>
        <Suspense fallback={null}>
          <AuthCard mode="signup" />
        </Suspense>
      </div>
    </div>
  );
}
