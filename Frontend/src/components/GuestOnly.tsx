"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "./Icon";

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] dark:bg-background">
      <Icon name="progress_activity" className="animate-spin text-primary" style={{ fontSize: 32 }} />
    </div>
  );
}

function GuestOnlyInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");
  const target = invite ? `/invite/${invite}` : "/projects";

  useEffect(() => {
    if (!loading && user) {
      router.replace(target);
    }
  }, [loading, user, router, target]);

  if (loading || user) {
    return <Spinner />;
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Spinner />}>
      <GuestOnlyInner>{children}</GuestOnlyInner>
    </Suspense>
  );
}
