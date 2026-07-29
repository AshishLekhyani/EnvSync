import { OrgRole } from "./api";

export function roleBadgeClass(role: OrgRole) {
  if (role === "OWNER") {
    return "border border-primary/20 bg-primary/10 text-primary";
  }
  return "border border-outline-variant bg-surface-container-highest text-on-surface-variant";
}
