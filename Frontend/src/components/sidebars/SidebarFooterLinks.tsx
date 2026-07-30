import Link from "next/link";
import { Icon } from "../Icon";

export function SidebarFooterLinks() {
  return (
    <div className="mt-auto flex flex-col gap-xs border-t border-outline-variant pt-md">
      <Link
        href="/docs"
        className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <Icon name="description" />
        <span className="font-label-md text-label-md">Docs</span>
      </Link>
      <a
        href="mailto:support@envsync.io"
        className="flex items-center gap-md rounded-lg px-md py-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <Icon name="contact_support" />
        <span className="font-label-md text-label-md">Support</span>
      </a>
    </div>
  );
}
