export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message ?? "Request failed";
    const code = body?.error?.code ?? "UNKNOWN";
    throw new ApiError(res.status, code, message);
  }

  return body as T;
}

export type OrgRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
export type EnvironmentType = "DEVELOPMENT" | "TESTING" | "STAGING" | "PRODUCTION";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}

export interface MeResponse extends PublicUser {
  organizations: OrgSummary[];
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentSummary {
  id: string;
  projectId: string;
  type: EnvironmentType;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecretMetadata {
  id: string;
  key: string;
  currentVersion: number;
  expiresAt: string | null;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberSummary {
  membershipId: string;
  role: OrgRole;
  user: { id: string; name: string; email: string };
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
  actor: { id: string; name: string; email: string } | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export type SecretChangeType = "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "ROTATE";

export interface SecretVersionMetadata {
  id: string;
  version: number;
  changeType: SecretChangeType;
  author: { id: string; name: string; email: string };
  createdAt: string;
}

export interface ApiTokenSummary {
  id: string;
  name: string;
  createdBy: { id: string; name: string; email: string };
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface ApiTokenCreated extends ApiTokenSummary {
  token: string;
}

export interface NotificationSummary {
  id: string;
  type: string;
  message: string;
  targetType: string | null;
  targetId: string | null;
  read: boolean;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export type EnvironmentAccessLevel = "NONE" | "READ" | "WRITE";

export interface PermissionCell {
  access: EnvironmentAccessLevel;
  isOverride: boolean;
}

export type PermissionMatrix = Record<OrgRole, Record<EnvironmentType, PermissionCell>>;

export interface InviteSummary {
  id: string;
  email: string;
  role: OrgRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface InviteCreated extends InviteSummary {
  token: string;
}

export interface PublicInvite {
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  email: string;
  expiresAt: string;
  accepted: boolean;
  expired: boolean;
}

export const api = {
  signup: (input: { name: string; email: string; password: string }) =>
    request<{ user: PublicUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  refresh: () => request<AuthResponse>("/auth/refresh", { method: "POST" }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<MeResponse>("/auth/me"),

  listOrgs: () => request<OrgSummary[]>("/orgs"),

  createOrg: (input: { name: string; slug: string }) =>
    request<{ id: string; name: string; slug: string }>("/orgs", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listProjects: (orgId: string) => request<Project[]>(`/orgs/${orgId}/projects`),

  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),

  createProject: (
    orgId: string,
    input: { name: string; slug: string; description?: string }
  ) =>
    request<Project>(`/orgs/${orgId}/projects`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listEnvironments: (projectId: string) =>
    request<EnvironmentSummary[]>(`/projects/${projectId}/environments`),

  getEnvironment: (environmentId: string) =>
    request<EnvironmentSummary>(`/environments/${environmentId}`),

  createEnvironment: (
    projectId: string,
    input: { type: EnvironmentType; name?: string }
  ) =>
    request<EnvironmentSummary>(`/projects/${projectId}/environments`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listSecrets: (environmentId: string) =>
    request<SecretMetadata[]>(`/environments/${environmentId}/secrets`),

  createSecret: (
    environmentId: string,
    input: { key: string; value: string; expiresAt?: string | null }
  ) =>
    request<SecretMetadata>(`/environments/${environmentId}/secrets`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  setSecretExpiry: (secretId: string, expiresAt: string | null) =>
    request<SecretMetadata>(`/secrets/${secretId}/expiry`, {
      method: "PATCH",
      body: JSON.stringify({ expiresAt }),
    }),

  revealSecret: (secretId: string) =>
    request<SecretMetadata & { value: string }>(`/secrets/${secretId}/reveal`),

  updateSecret: (secretId: string, input: { value: string }) =>
    request<SecretMetadata>(`/secrets/${secretId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteSecret: (secretId: string) =>
    request<void>(`/secrets/${secretId}`, { method: "DELETE" }),

  listMembers: (orgId: string) => request<MemberSummary[]>(`/orgs/${orgId}/members`),

  addMember: (orgId: string, input: { email: string; role: OrgRole }) =>
    request<MemberSummary>(`/orgs/${orgId}/members`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listAuditLogs: (
    orgId: string,
    params?: { projectId?: string; action?: string; limit?: number }
  ) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", params.projectId);
    if (params?.action) qs.set("action", params.action);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<AuditLogEntry[]>(`/orgs/${orgId}/audit-logs${suffix}`);
  },

  listSecretVersions: (secretId: string) =>
    request<SecretVersionMetadata[]>(`/secrets/${secretId}/versions`),

  revealSecretVersion: (secretId: string, version: number) =>
    request<{ version: number; value: string }>(
      `/secrets/${secretId}/versions/${version}/reveal`
    ),

  restoreSecretVersion: (secretId: string, version: number) =>
    request<SecretMetadata>(`/secrets/${secretId}/versions/${version}/restore`, {
      method: "POST",
    }),

  rotateSecret: (secretId: string, input?: { length?: number }) =>
    request<SecretMetadata & { value: string }>(`/secrets/${secretId}/rotate`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    }),

  createApiToken: (orgId: string, input: { name: string }) =>
    request<ApiTokenCreated>(`/orgs/${orgId}/tokens`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listApiTokens: (orgId: string) => request<ApiTokenSummary[]>(`/orgs/${orgId}/tokens`),

  revokeApiToken: (orgId: string, tokenId: string) =>
    request<ApiTokenSummary>(`/orgs/${orgId}/tokens/${tokenId}`, {
      method: "DELETE",
    }),

  listSessions: () => request<SessionSummary[]>("/auth/sessions"),

  revokeSession: (sessionId: string) =>
    request<void>(`/auth/sessions/${sessionId}`, { method: "DELETE" }),

  listNotifications: () => request<NotificationSummary[]>("/notifications"),

  markNotificationRead: (notificationId: string) =>
    request<NotificationSummary>(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    }),

  markAllNotificationsRead: () =>
    request<void>("/notifications/read-all", { method: "POST" }),

  getPermissionMatrix: (orgId: string) =>
    request<PermissionMatrix>(`/orgs/${orgId}/permissions`),

  setPermissionOverride: (
    orgId: string,
    input: { role: OrgRole; environmentType: EnvironmentType; access: EnvironmentAccessLevel | null }
  ) =>
    request<PermissionMatrix>(`/orgs/${orgId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  createInvite: (orgId: string, input: { email: string; role: OrgRole }) =>
    request<InviteCreated>(`/orgs/${orgId}/invites`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listInvites: (orgId: string) => request<InviteSummary[]>(`/orgs/${orgId}/invites`),

  getInviteByToken: (token: string) => request<PublicInvite>(`/invites/${token}`),

  acceptInvite: (token: string) =>
    request<MemberSummary>(`/invites/${token}/accept`, { method: "POST" }),
};
