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
  "permission.override_set": {
    icon: "tune",
    label: "Changed environment permission",
    iconClass: "text-primary",
  },
  "permission.override_reset": {
    icon: "settings_backup_restore",
    label: "Reset environment permission",
    iconClass: "text-primary",
  },
  "invite.create": { icon: "mail", label: "Sent invite", iconClass: "text-primary" },
  "invite.accept": { icon: "how_to_reg", label: "Accepted invite", iconClass: "text-primary" },
  "invite.approve": { icon: "check_circle", label: "Approved invite", iconClass: "text-primary" },
  "invite.reject": { icon: "cancel", label: "Rejected invite", iconClass: "text-error" },
  "invite.auto_approve_set": {
    icon: "rule",
    label: "Changed invite auto-approval",
    iconClass: "text-primary",
  },
  "member.project_access_grant": {
    icon: "add_moderator",
    label: "Granted project access",
    iconClass: "text-primary",
  },
  "member.project_access_revoke": {
    icon: "remove_moderator",
    label: "Revoked project access",
    iconClass: "text-error",
  },
  "member.view_all_set": {
    icon: "visibility",
    label: "Changed project visibility",
    iconClass: "text-primary",
  },
  "member.leave": { icon: "logout", label: "Left the organization", iconClass: "text-error" },
  "org.ownership_transfer": {
    icon: "swap_horiz",
    label: "Transferred ownership",
    iconClass: "text-primary",
  },
  "project_access.request": {
    icon: "front_hand",
    label: "Requested project access",
    iconClass: "text-primary",
  },
  "project_access.approve": {
    icon: "check_circle",
    label: "Approved project access request",
    iconClass: "text-primary",
  },
  "project_access.reject": {
    icon: "cancel",
    label: "Rejected project access request",
    iconClass: "text-error",
  },
  "secret.expiry_update": {
    icon: "schedule",
    label: "Changed secret expiry",
    iconClass: "text-primary",
  },
  "secret.restore_deleted": {
    icon: "restore_from_trash",
    label: "Restored deleted secret",
    iconClass: "text-primary",
  },
  "audit_log.purge": {
    icon: "delete_sweep",
    label: "Purged audit logs",
    iconClass: "text-error",
  },
  "project_creation.request": {
    icon: "front_hand",
    label: "Requested project creation",
    iconClass: "text-primary",
  },
  "project_creation.approve": {
    icon: "check_circle",
    label: "Approved project creation",
    iconClass: "text-primary",
  },
  "project_creation.reject": {
    icon: "cancel",
    label: "Rejected project creation",
    iconClass: "text-error",
  },
};

const FALLBACK_DISPLAY: ActionDisplay = {
  icon: "info",
  label: "Unknown action",
  iconClass: "text-secondary",
};

export function getActionDisplay(action: string): ActionDisplay {
  return ACTION_DISPLAY[action] ?? { ...FALLBACK_DISPLAY, label: action };
}

interface AuditLogLike {
  action: string;
  metadata?: Record<string, unknown> | null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function describeAuditLog(log: AuditLogLike): string | null {
  const m = log.metadata ?? {};

  switch (log.action) {
    case "member.role_change": {
      const prev = asString(m.previousRole);
      const next = asString(m.newRole);
      return prev && next ? `${prev} → ${next}` : null;
    }
    case "member.project_access_grant":
    case "member.project_access_revoke": {
      const project = asString(m.projectName);
      const email = asString(m.targetUserEmail);
      if (!project) return null;
      const verb = log.action === "member.project_access_grant" ? "Granted" : "Revoked";
      return email ? `${verb} access to ${project} for ${email}` : `${verb} access to ${project}`;
    }
    case "member.view_all_set": {
      const email = asString(m.targetUserEmail);
      const on = m.canViewAllProjects === true;
      const verb = on ? "can now see every project" : "restricted to granted projects";
      return email ? `${email} ${verb}` : null;
    }
    case "member.add":
    case "invite.accept": {
      const role = asString(m.role);
      return role ? `Joined as ${role}` : null;
    }
    case "invite.create": {
      const email = asString(m.email);
      const role = asString(m.role);
      return email && role ? `Invited ${email} as ${role}` : null;
    }
    case "org.update": {
      const prev = asString(m.previousName);
      const next = asString(m.newName);
      return prev && next && prev !== next ? `Renamed from '${prev}' to '${next}'` : null;
    }
    case "project.update": {
      const prevName = asString(m.previousName);
      const newName = asString(m.newName);
      if (prevName && newName && prevName !== newName) {
        return `Renamed from '${prevName}' to '${newName}'`;
      }
      return null;
    }
    case "project.create":
    case "project.delete":
    case "org.delete": {
      const name = asString(m.name);
      return name ? `'${name}'` : null;
    }
    case "environment.create":
    case "environment.delete": {
      const type = asString(m.type);
      return type ? type : null;
    }
    case "secret.create":
    case "secret.update":
    case "secret.delete":
    case "secret.rotate":
    case "secret.restore":
    case "secret.expiry_update": {
      const envName = asString(m.environmentName);
      const envType = asString(m.environmentType);
      return envName ? `in ${envName}${envType ? ` (${envType})` : ""}` : null;
    }
    case "permission.override_set": {
      const role = asString(m.role);
      const envType = asString(m.environmentType);
      const access = asString(m.access);
      return role && envType && access ? `${role} on ${envType} → ${access}` : null;
    }
    case "permission.override_reset": {
      const role = asString(m.role);
      const envType = asString(m.environmentType);
      return role && envType ? `${role} on ${envType} reset to default` : null;
    }
    case "org.ownership_transfer": {
      const prev = asString(m.previousOwnerEmail);
      const next = asString(m.newOwnerEmail);
      return prev && next ? `${prev} → ${next}` : null;
    }
    case "member.leave": {
      const email = asString(m.email);
      return email ? `${email} left` : null;
    }
    case "project_access.request":
    case "project_access.approve":
    case "project_access.reject": {
      const project = asString(m.projectName);
      const email = asString(m.requesterEmail);
      const role = asString(m.grantedRole) ?? asString(m.requestedRole);
      if (!project) return null;
      const base = email ? `${project} for ${email}` : project;
      return role ? `${base} as ${role}` : base;
    }
    case "secret.restore_deleted": {
      const envName = asString(m.environmentName);
      const envType = asString(m.environmentType);
      return envName ? `in ${envName}${envType ? ` (${envType})` : ""}` : null;
    }
    case "audit_log.purge": {
      const before = asString(m.beforeDate);
      const count = typeof m.deletedCount === "number" ? m.deletedCount : undefined;
      if (!before) return null;
      return count !== undefined ? `${count} entries before ${before}` : `before ${before}`;
    }
    case "project_creation.request":
    case "project_creation.approve":
    case "project_creation.reject": {
      const name = asString(m.name);
      const email = asString(m.requesterEmail);
      if (!name) return null;
      return email ? `'${name}' for ${email}` : `'${name}'`;
    }
    default:
      return null;
  }
}
