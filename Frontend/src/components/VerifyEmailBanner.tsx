"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";

export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerifiedAt) {
    return null;
  }

  const onResend = async () => {
    setSending(true);
    setError(null);
    try {
      const result = await api.resendVerificationEmail();
      setSent(result.sent);
      if (result.verifyToken) {
        setDevLink(`${window.location.origin}/verify-email/${result.verifyToken}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to resend");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (!devLink) return;
    try {
      await navigator.clipboard.writeText(devLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-xs border-b border-amber-500/30 bg-amber-500/10 px-md py-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-xs">
        <Icon name="mark_email_unread" className="text-amber-700 dark:text-amber-400" style={{ fontSize: 18 }} />
        <span className="font-body-sm text-body-sm text-amber-700 dark:text-amber-400">
          {error
            ? error
            : sent
              ? "Verification email sent — check your inbox."
              : "Verify your email to secure your account."}
        </span>
      </div>
      {!sent && !devLink && (
        <button
          type="button"
          disabled={sending}
          onClick={onResend}
          className="flex-shrink-0 font-label-md text-label-md text-amber-700 underline hover:opacity-80 disabled:opacity-50 dark:text-amber-400"
        >
          {sending ? "Sending..." : "Resend email"}
        </button>
      )}
      {devLink && (
        <div className="flex items-center gap-sm rounded-lg border border-amber-500/30 bg-white px-sm py-1 dark:bg-surface-container-lowest">
          <span className="truncate font-code-sm text-code-sm text-on-surface" style={{ maxWidth: 260 }}>
            {devLink}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="flex-shrink-0 text-amber-700 hover:opacity-80 dark:text-amber-400"
          >
            <Icon name={copied ? "check" : "content_copy"} style={{ fontSize: 16 }} />
          </button>
        </div>
      )}
    </div>
  );
}
