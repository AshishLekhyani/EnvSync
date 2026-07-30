"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "./Icon";

/** Renders children only for logged-out visitors; redirects an already-authenticated user to /projects. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/projects");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FA] dark:bg-background">
        <Icon name="progress_activity" className="animate-spin text-primary" style={{ fontSize: 32 }} />
      </div>
    );
  }

  return <>{children}</>;
}
