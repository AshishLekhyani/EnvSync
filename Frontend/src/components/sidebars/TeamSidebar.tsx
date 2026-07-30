import { SectionNav } from "../SectionNav";

const ITEMS = [
  { href: "/team/members", label: "Members", icon: "group" },
  { href: "/team/permissions", label: "Permissions", icon: "admin_panel_settings" },
  { href: "/team/invites", label: "Invites", icon: "person_add" },
];

export function TeamSidebar() {
  return <SectionNav items={ITEMS} />;
}
