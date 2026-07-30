import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-md bg-[#F6F8FA] dark:bg-background px-margin-mobile text-center font-body-md text-body-md text-on-surface antialiased">
      <Icon name="search_off" className="text-primary" style={{ fontSize: 48 }} />
      <h1 className="font-h1 text-h1 text-on-surface">Page not found</h1>
      <p className="max-w-md font-body-md text-body-md text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/projects"
        className="mt-md rounded-lg bg-primary-container px-lg py-md font-label-md text-label-md text-on-primary shadow-sm transition-all hover:opacity-90"
      >
        Back to EnvSync
      </Link>
    </div>
  );
}
