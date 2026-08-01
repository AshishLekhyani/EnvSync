export const queryKeys = {
  me: () => ["me"] as const,
  org: (orgId: string) => ["org", orgId] as const,
  orgProjects: (orgId: string) => ["org", orgId, "projects"] as const,
  orgMembers: (orgId: string) => ["org", orgId, "members"] as const,
  orgAuditLogs: (orgId: string, params?: Record<string, unknown>) =>
    ["org", orgId, "audit-logs", params ?? {}] as const,
  orgTokens: (orgId: string) => ["org", orgId, "tokens"] as const,
  orgPermissions: (orgId: string) => ["org", orgId, "permissions"] as const,
  orgInvites: (orgId: string) => ["org", orgId, "invites"] as const,
  orgAutoApproveRules: (orgId: string) => ["org", orgId, "auto-approve"] as const,
  orgAccessRequests: (orgId: string) => ["org", orgId, "access-requests"] as const,
  environmentDeletedSecrets: (environmentId: string) =>
    ["environment", environmentId, "secrets", "deleted"] as const,
  projectMembers: (projectId: string) => ["project", projectId, "members"] as const,
  orgProjectCreationRequests: (orgId: string) =>
    ["org", orgId, "project-creation-requests"] as const,
  orgProjectCreateAutoApprove: (orgId: string) =>
    ["org", orgId, "project-create-auto-approve"] as const,
  project: (projectId: string) => ["project", projectId] as const,
  projectEnvironments: (projectId: string) =>
    ["project", projectId, "environments"] as const,
  environment: (environmentId: string) => ["environment", environmentId] as const,
  environmentSecrets: (environmentId: string) =>
    ["environment", environmentId, "secrets"] as const,
  secretVersions: (secretId: string) => ["secret", secretId, "versions"] as const,
  notifications: () => ["notifications"] as const,
  sessions: () => ["sessions"] as const,
  invite: (token: string) => ["invite", token] as const,
};
