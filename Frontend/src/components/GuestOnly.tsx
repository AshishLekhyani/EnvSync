"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoadingScreen } from "./LoadingScreen";

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

  if (!loading && user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GuestOnlyInner>{children}</GuestOnlyInner>
    </Suspense>
  );
}
