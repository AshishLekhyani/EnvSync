"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function RedirectIfLoggedIn() {
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

  return null;
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectIfLoggedIn />
      </Suspense>
      {children}
    </>
  );
}
