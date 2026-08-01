"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite");

  useEffect(() => {
    router.replace(invite ? `/login?invite=${invite}` : "/login");
  }, [router, invite]);

  return null;
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupRedirect />
    </Suspense>
  );
}
