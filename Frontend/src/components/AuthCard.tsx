"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { API_URL, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "Single sign-on isn't configured on this server yet.",
  oauth_denied: "Sign-in was cancelled.",
  state_mismatch: "Sign-in failed. Please try again.",
  email_in_use: "An account with this email already exists. Log in with your password.",
  oauth_failed: "Sign-in failed. Please try again.",
};

export function AuthCard({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const oauthError = searchParams.get("error");
  const { login, signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState<{
    email: string;
    verifyToken: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const isLogin = mode === "login";

  useEffect(() => {
    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] ?? "Something went wrong. Please try again.");
    }
  }, [oauthError]);

  const postAuthPath = invite ? `/invite/${invite}` : "/projects";
  const googleHref = `${API_URL}/auth/google${invite ? `?invite=${encodeURIComponent(invite)}` : ""}`;

  const verifyLink =
    awaitingVerification?.verifyToken && typeof window !== "undefined"
      ? `${window.location.origin}/verify-email/${awaitingVerification.verifyToken}`
      : null;

  const copyLink = async () => {
    if (!verifyLink) return;
    try {
      await navigator.clipboard.writeText(verifyLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      /* ignore */
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
        router.push(postAuthPath);
      } else {
        const result = await signup(name, email, password);
        setAwaitingVerification({ email, verifyToken: result.verifyToken });
        setSubmitting(false);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-xl shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="mb-xl text-center">
        <Link
          href="/"
          className="mb-lg inline-block font-h2 text-h2 font-black text-primary lg:hidden"
        >
          EnvSync
        </Link>
        <h1 className="font-h1 text-h1 text-on-surface">
          {awaitingVerification
            ? "Check your email"
            : isLogin
              ? "Welcome back"
              : "Create your account"}
        </h1>
        <p className="mt-base font-body-md text-body-md text-secondary">
          {awaitingVerification
            ? "Verify your address to finish creating your account."
            : isLogin
              ? "Sign in to sync and manage encrypted environment variables."
              : "Start securing your team's .env files in minutes."}
        </p>
      </div>

      {awaitingVerification ? (
        <div className="flex flex-col gap-md">
          <div className="rounded-lg border border-outline-variant bg-surface-container-low p-md text-center">
            <Icon name="mark_email_read" className="mb-xs text-primary" style={{ fontSize: 28 }} />
            <p className="font-body-sm text-body-sm text-secondary">
              We sent a verification link to <strong>{awaitingVerification.email}</strong>. Your
              account won&apos;t be created until you click it.
            </p>
          </div>

          {verifyLink && (
            <div className="flex flex-col gap-sm rounded-lg border border-primary/30 bg-primary/5 p-md">
              <p className="font-body-sm text-body-sm text-secondary">
                This app has no email provider configured, so your verification link is shown
                directly here instead — copy it now.
              </p>
              <div className="flex items-center justify-between gap-sm rounded-lg border border-outline-variant bg-surface-container-high p-md">
                <span className="truncate pr-md font-code-md text-code-md text-on-surface">
                  {verifyLink}
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

          <button
            type="button"
            onClick={() => setAwaitingVerification(null)}
            className="text-center font-body-sm text-body-sm font-medium text-primary hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
      <a
        href={googleHref}
        className="mb-md flex w-full items-center justify-center gap-sm rounded-lg border border-outline-variant bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container dark:bg-surface-container"
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

      <div className="mb-md flex items-center gap-md">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="font-body-sm text-body-sm text-secondary">or</span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>

      {error && (
        <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-md">
        {!isLogin && (
          <label className="block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">
              Full name
            </span>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ashish Kumar"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary-container"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-xs block font-label-md text-label-md text-on-surface">
            Work email
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

        <label className="block">
          <span className="mb-xs block font-label-md text-label-md text-on-surface">
            Password
          </span>
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
              minLength={8}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm pr-xl font-body-md text-body-md text-on-surface outline-none transition-all placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary-container"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-sm top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name={showPassword ? "visibility_off" : "visibility"} />
            </button>
          </div>
        </label>

        {isLogin && (
          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="font-body-sm text-body-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting
            ? "Please wait..."
            : isLogin
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className="mt-lg text-center font-body-sm text-body-sm text-secondary">
        {isLogin ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href={invite ? `/signup?invite=${invite}` : "/signup"}
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href={invite ? `/login?invite=${invite}` : "/login"}
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </>
        )}
      </p>

      {!isLogin && (
        <p className="mt-md text-center font-body-sm text-body-sm text-outline">
          By creating an account you agree to our Terms and Privacy Policy.
        </p>
      )}
      </>
      )}
    </div>
  );
}
