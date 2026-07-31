"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { verifyAndLogin } = useAuth();

  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    verifyAndLogin(token)
      .then(() => {
        setStatus("success");
        window.setTimeout(() => router.push("/projects"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setError(
          err instanceof ApiError ? err.message : "This verification link is invalid or has expired."
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-margin-mobile dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <ThemeToggle className="fixed right-md top-md z-50 bg-surface-container-low shadow-sm" />
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-xl text-center shadow-[0_1px_0_rgba(27,31,35,0.04)]">
        <Link href="/" className="mb-lg inline-block font-h2 text-h2 font-black text-primary">
          EnvSync
        </Link>

        {status === "pending" && (
          <div className="flex flex-col items-center gap-md py-md">
            <Icon name="progress_activity" className="animate-spin text-primary" style={{ fontSize: 32 }} />
            <p className="font-body-md text-body-md text-secondary">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-md py-md">
            <Icon name="check_circle" className="text-primary" style={{ fontSize: 32 }} />
            <h1 className="font-h1 text-h1 text-on-surface">Email verified</h1>
            <p className="font-body-sm text-body-sm text-secondary">
              Your account is ready. Taking you in...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-md py-md">
            <Icon name="error" className="text-[#CF222E] dark:text-red-400" style={{ fontSize: 32 }} />
            <h1 className="font-h1 text-h1 text-on-surface">Verification failed</h1>
            <p className="font-body-sm text-body-sm text-secondary">{error}</p>
            <Link
              href="/signup"
              className="w-full rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90"
            >
              Back to Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
