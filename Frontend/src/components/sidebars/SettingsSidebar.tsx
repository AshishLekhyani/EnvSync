import { SectionNav } from "../SectionNav";

const ITEMS = [
  { href: "/settings/profile", label: "Profile", icon: "person" },
  { href: "/settings/organization", label: "Organization", icon: "corporate_fare" },
  { href: "/settings/cli", label: "CLI & Tokens", icon: "terminal" },
  { href: "/settings/security", label: "Security", icon: "shield" },
];

export function SettingsSidebar() {
  return <SectionNav items={ITEMS} />;
}
