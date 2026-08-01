"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Google sign-in isn't configured on this server yet.",
  oauth_denied: "Sign-in was cancelled.",
  state_mismatch: "Sign-in failed. Please try again.",
  oauth_failed: "Sign-in failed. Please try again.",
};

export function AuthCard() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const oauthError = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] ?? "Something went wrong. Please try again.");
    }
  }, [oauthError]);

  const googleHref = `${API_URL}/auth/google${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`;

  return (
    <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-xl shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="mb-xl text-center">
        <Link
          href="/"
          className="mb-lg inline-block font-h2 text-h2 font-black text-primary lg:hidden"
        >
          EnvSync
        </Link>
        <h1 className="font-h1 text-h1 text-on-surface">Welcome to EnvSync</h1>
        <p className="mt-base font-body-md text-body-md text-secondary">
          Sign in with Google to sync and manage encrypted environment variables.
        </p>
      </div>

      {error && (
        <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <a
        href={googleHref}
        className="flex w-full items-center justify-center gap-sm rounded-lg border border-outline-variant bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container dark:bg-surface-container"
      >
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
        Continue with Google
      </a>

      <p className="mt-lg text-center font-body-sm text-body-sm text-outline">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </div>
  );
}
