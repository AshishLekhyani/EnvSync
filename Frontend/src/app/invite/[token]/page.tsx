"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, PublicInvite } from "@/lib/api";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading, logout, refreshMe } = useAuth();

  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .getInviteByToken(token)
      .then((result) => {
        if (!cancelled) {
          setInvite(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "This invite link is invalid.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await api.acceptInvite(token);
      await refreshMe();
      router.push("/projects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept invite");
      setAccepting(false);
    }
  };

  const onLogout = async () => {
    await logout();
    router.push(`/login?invite=${token}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] px-margin-mobile dark:bg-background font-body-md text-body-md text-on-surface antialiased">
      <ThemeToggle className="fixed right-md top-md z-50 bg-surface-container-low shadow-sm" />
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white dark:bg-surface-container-lowest p-xl shadow-[0_1px_0_rgba(27,31,35,0.04)]">
        <div className="mb-lg text-center">
          <Link href="/" className="mb-lg inline-block font-h2 text-h2 font-black text-primary">
            EnvSync
          </Link>
        </div>

        {loading || authLoading ? (
          <div className="flex justify-center py-lg text-secondary">
            <Icon name="progress_activity" className="animate-spin" style={{ fontSize: 28 }} />
          </div>
        ) : !invite ? (
          <p className="text-center font-body-md text-body-md text-secondary">
            {error ?? "This invite link is invalid."}
          </p>
        ) : invite.accepted ? (
          <p className="text-center font-body-md text-body-md text-secondary">
            This invite has already been used.
          </p>
        ) : invite.expired ? (
          <p className="text-center font-body-md text-body-md text-secondary">
            This invite has expired — ask an admin to send a new one.
          </p>
        ) : (
          <>
            <h1 className="mb-md text-center font-h1 text-h1 text-on-surface">
              Join {invite.orgName}
            </h1>
            <p className="mb-lg text-center font-body-md text-body-md text-secondary">
              You&apos;ve been invited to join <strong>{invite.orgName}</strong> as a{" "}
              <strong>{invite.role}</strong>
              {invite.project ? (
                <>
                  {" "}with access to <strong>{invite.project.name}</strong>.
                </>
              ) : (
                "."
              )}
            </p>

            {error && (
              <div className="mb-md rounded-lg border border-[#CF222E]/30 bg-[#FFEBE9] px-md py-sm font-body-sm text-body-sm text-[#CF222E] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            {!user ? (
              <div className="flex flex-col gap-sm">
                <Link
                  href={`/signup?invite=${token}`}
                  className="w-full rounded-lg bg-primary-container px-md py-sm text-center font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90"
                >
                  Sign up to join
                </Link>
                <Link
                  href={`/login?invite=${token}`}
                  className="w-full rounded-lg border border-outline-variant px-md py-sm text-center font-label-md text-label-md text-on-surface"
                >
                  Log in
                </Link>
              </div>
            ) : user.email.toLowerCase() !== invite.email.toLowerCase() ? (
              <div className="flex flex-col gap-md">
                <p className="text-center font-body-sm text-body-sm text-secondary">
                  This invite was sent to <strong>{invite.email}</strong>, but you&apos;re
                  signed in as <strong>{user.email}</strong>.
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-lg border border-outline-variant px-md py-sm font-label-md text-label-md text-on-surface"
                >
                  Log out and try again
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={accepting}
                onClick={onAccept}
                className="w-full rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
              >
                {accepting ? "Joining..." : "Accept Invite"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
