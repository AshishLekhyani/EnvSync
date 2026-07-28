"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Icon } from "@/components/Icon";

export function AuthCard({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const isLogin = mode === "login";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    router.push("/projects");
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-outline-variant bg-white p-xl shadow-[0_1px_0_rgba(27,31,35,0.04)]">
      <div className="mb-xl text-center">
        <Link
          href="/"
          className="mb-lg inline-block font-h2 text-h2 font-black text-primary lg:hidden"
        >
          EnvSync
        </Link>
        <h1 className="font-h1 text-h1 text-on-surface">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-base font-body-md text-body-md text-secondary">
          {isLogin
            ? "Sign in to sync and manage encrypted environment variables."
            : "Start securing your team's .env files in minutes."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/projects")}
        className="mb-md flex w-full items-center justify-center gap-sm rounded-lg border border-outline-variant bg-[#F6F8FA] px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
        Continue with GitHub
      </button>

      <div className="mb-md flex items-center gap-md">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="font-body-sm text-body-sm text-secondary">or</span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>

      <form onSubmit={onSubmit} className="space-y-md">
        {!isLogin && (
          <label className="block">
            <span className="mb-xs block font-label-md text-label-md text-on-surface">
              Full name
            </span>
            <input
              required
              type="text"
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
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-sm font-body-sm text-body-sm text-secondary">
              <input
                type="checkbox"
                className="rounded border-outline-variant text-primary-container focus:ring-primary-container"
              />
              Remember me
            </label>
            <a
              href="#"
              className="font-body-sm text-body-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </a>
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-lg bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
        >
          {isLogin ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-lg text-center font-body-sm text-body-sm text-secondary">
        {isLogin ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
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
    </div>
  );
}
