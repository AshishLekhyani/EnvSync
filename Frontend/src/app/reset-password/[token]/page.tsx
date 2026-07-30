"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GuestOnly } from "@/components/GuestOnly";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, ApiError } from "@/lib/api";

function ResetPasswordForm() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      window.setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "This reset link is invalid or has expired."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-xl shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="mb-xl text-center">
        <Link href="/" className="mb-lg inline-block font-h2 text-h2 font-black text-primary">
          EnvSync
        </Link>
        <h1 className="font-h1 text-h1 text-on-surface">Choose a new password</h1>
      </div>

      {success ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-md text-center">
          <Icon name="check_circle" className="mb-xs text-primary" style={{ fontSize: 28 }} />
          <p className="font-body-sm text-body-sm text-secondary">
            Password updated. Every other session was signed out. Redirecting to log in...
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-md">
          <label className="block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">
              New password
            </span>
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary-container"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? "Please wait..." : "Reset password"}
          </button>

          <p className="text-center font-body-sm text-body-sm text-secondary">
            <Link href="/forgot-password" className="font-medium text-primary hover:underline">
              Request a new link
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <GuestOnly>
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-margin-mobile dark:bg-background font-body-md text-body-md text-on-surface antialiased">
        <ThemeToggle className="fixed right-md top-md z-50 bg-surface-container-low shadow-sm" />
        <ResetPasswordForm />
      </div>
    </GuestOnly>
  );
}
