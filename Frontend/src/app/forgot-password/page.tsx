"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { GuestOnly } from "@/components/GuestOnly";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, ApiError } from "@/lib/api";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetLink =
    resetToken && typeof window !== "undefined"
      ? `${window.location.origin}/reset-password/${resetToken}`
      : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { resetToken: token } = await api.requestPasswordReset(email);
      setResetToken(token);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-xl shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="mb-xl text-center">
        <Link href="/" className="mb-lg inline-block font-h2 text-h2 font-black text-primary">
          EnvSync
        </Link>
        <h1 className="font-h1 text-h1 text-on-surface">Reset your password</h1>
        <p className="mt-base font-body-md text-body-md text-secondary">
          Enter your account email and we&apos;ll generate a reset link.
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={onSubmit} className="space-y-md">
          <label className="block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">
              Email
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
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
            {submitting ? "Please wait..." : "Send reset link"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md text-center">
            <Icon name="mark_email_read" className="mb-xs text-primary" style={{ fontSize: 28 }} />
            <p className="font-body-sm text-body-sm text-secondary">
              If an account exists for <strong>{email}</strong>, here&apos;s how to reset it.
            </p>
          </div>

          {resetLink && (
            <div className="flex flex-col gap-sm rounded-lg border border-primary/30 bg-primary/5 p-md">
              <p className="font-body-sm text-body-sm text-secondary">
                This app has no email provider configured, so your reset link is shown directly
                here instead — copy it now, it won&apos;t be shown again.
              </p>
              <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-high p-md">
                <span className="truncate pr-md font-code-md text-code-md text-on-surface">
                  {resetLink}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-shrink-0 rounded-md bg-primary-container p-sm text-on-primary-container transition-opacity hover:opacity-90"
                >
                  <Icon name={copied ? "check" : "content_copy"} />
                </button>
              </div>
            </div>
          )}

          <Link
            href="/login"
            className="text-center font-body-sm text-body-sm font-medium text-primary hover:underline"
          >
            Back to log in
          </Link>
        </div>
      )}

      {!submitted && (
        <p className="mt-lg text-center font-body-sm text-body-sm text-secondary">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <GuestOnly>
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-margin-mobile dark:bg-background font-body-md text-body-md text-on-surface antialiased">
        <ThemeToggle className="fixed right-md top-md z-50 bg-surface-container-low shadow-sm" />
        <ForgotPasswordForm />
      </div>
    </GuestOnly>
  );
}
