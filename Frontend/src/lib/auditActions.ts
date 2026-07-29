interface ActionDisplay {
  icon: string;
  label: string;
  iconClass: string;
}

export const ACTION_DISPLAY: Record<string, ActionDisplay> = {
  "org.create": { icon: "apartment", label: "Created organization", iconClass: "text-primary" },
  "org.update": { icon: "edit", label: "Updated organization", iconClass: "text-primary" },
  "org.delete": { icon: "delete", label: "Deleted organization", iconClass: "text-error" },
  "member.add": { icon: "person_add", label: "Added member", iconClass: "text-primary" },
  "member.role_change": {
    icon: "manage_accounts",
    label: "Changed member role",
    iconClass: "text-primary",
  },
  "member.remove": { icon: "person_remove", label: "Removed member", iconClass: "text-error" },
  "project.create": { icon: "create_new_folder", label: "Created project", iconClass: "text-primary" },
  "project.update": { icon: "edit", label: "Updated project", iconClass: "text-primary" },
  "project.delete": { icon: "delete", label: "Deleted project", iconClass: "text-error" },
  "environment.create": { icon: "dns", label: "Created environment", iconClass: "text-primary" },
  "environment.delete": { icon: "delete", label: "Deleted environment", iconClass: "text-error" },
  "secret.create": { icon: "add", label: "Created secret", iconClass: "text-primary" },
  "secret.update": { icon: "edit", label: "Updated secret", iconClass: "text-primary" },
  "secret.delete": { icon: "delete", label: "Deleted secret", iconClass: "text-error" },
  "secret.reveal": { icon: "visibility", label: "Revealed secret", iconClass: "text-tertiary" },
  "secret.version_reveal": {
    icon: "history",
    label: "Revealed historical version",
    iconClass: "text-tertiary",
  },
  "secret.restore": { icon: "restore", label: "Restored secret", iconClass: "text-primary" },
  "secret.rotate": { icon: "autorenew", label: "Rotated secret", iconClass: "text-primary" },
  "apitoken.create": { icon: "key", label: "Created API token", iconClass: "text-primary" },
  "apitoken.revoke": { icon: "block", label: "Revoked API token", iconClass: "text-error" },
};

const FALLBACK_DISPLAY: ActionDisplay = {
  icon: "info",
  label: "Unknown action",
  iconClass: "text-secondary",
};

export function getActionDisplay(action: string): ActionDisplay {
  return ACTION_DISPLAY[action] ?? { ...FALLBACK_DISPLAY, label: action };
}
