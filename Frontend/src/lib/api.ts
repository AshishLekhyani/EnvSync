export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
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

// /auth/refresh must never trigger another refresh attempt (infinite recursion).
const NO_REFRESH_RETRY_PATHS = new Set(["/auth/refresh", "/auth/login", "/auth/signup"]);

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const body = await res.json();
        accessToken = body.accessToken;
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function trySilentRefresh(): Promise<boolean> {
  return refreshAccessToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
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

  if (res.status === 401 && !isRetry && !NO_REFRESH_RETRY_PATHS.has(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    accessToken = null;
    sessionExpiredHandler?.();
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message ?? "Request failed";
    const code = body?.error?.code ?? "UNKNOWN";
    throw new ApiError(res.status, code, message);
  }

  return body as T;
}

// Org-level role: only OWNER carries real org-wide privilege; VIEWER is a meaningless
// placeholder for "plain member". Real Admin/Developer/Viewer tiers only exist per
// project — see ProjectRole.
export type OrgRole = "OWNER" | "VIEWER";
export type ProjectRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";
export type EnvironmentType = "DEVELOPMENT" | "TESTING" | "STAGING" | "PRODUCTION";

export type AuthProvider = "PASSWORD" | "GITHUB" | "GOOGLE";

export interface NotificationPrefs {
  approvalRequests: boolean;
  accessChanges: boolean;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  authProvider: AuthProvider;
  avatarUrl: string | null;
  notificationPrefs: NotificationPrefs;
  emailVerifiedAt: string | null;
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
  environmentCount: number;
  createdAt: string;
  updatedAt: string;
  hasAccess?: boolean;
  hasPendingAccessRequest?: boolean;
  myRole?: ProjectRole | null;
}

export type EnvironmentAccess = "none" | "read" | "write";

export interface EnvironmentSummary {
  id: string;
  projectId: string;
  type: EnvironmentType;
  name: string;
  createdAt: string;
  updatedAt: string;
  access: EnvironmentAccess;
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
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
  canViewAllProjects?: boolean;
  projectAccess?: { id: string; name: string; role: ProjectRole }[];
}

export interface ProjectMemberSummary {
  role: ProjectRole;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}

export interface ProjectCreationRequestSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  requestedBy: { id: string; name: string; email: string };
  createdAt: string;
}

export interface ProjectCreateAutoApproveRuleSummary {
  id: string;
  admin: { id: string; name: string; email: string };
  createdAt: string;
}

export type CreateProjectResult =
  | { status: "created"; project: Project }
  | { status: "pending"; request: ProjectCreationRequestSummary };

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

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export type SecretChangeType = "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "ROTATE";

export interface SecretVersionMetadata {
  id: string;
  version: number;
  changeType: SecretChangeType;
  author: { id: string; name: string; email: string } | null;
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
  metadata: Record<string, unknown> | null;
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

export type PermissionMatrix = Record<ProjectRole, Record<EnvironmentType, PermissionCell>>;

export interface InviteSummary {
  id: string;
  email: string;
  role: ProjectRole | null;
  projectId: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export interface InviteCreated extends InviteSummary {
  token: string | null;
}

export interface PublicInvite {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: ProjectRole | null;
  email: string;
  project: { id: string; name: string } | null;
  expiresAt: string;
  accepted: boolean;
  expired: boolean;
  pendingApproval: boolean;
  rejected: boolean;
}

export interface ProjectAccessRequestSummary {
  id: string;
  project: { id: string; name: string };
  requestedBy: { id: string; name: string; email: string };
  requestedRole: ProjectRole | null;
  createdAt: string;
}

export interface DeletedSecretMetadata extends SecretMetadata {
  deletedAt: string;
  purgesAt: string;
}

export const api = {
  getCliVersion: () => request<{ version: string | null }>("/meta/cli-version"),

  refresh: (signal?: AbortSignal) =>
    request<AuthResponse>("/auth/refresh", { method: "POST", signal }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<MeResponse>("/auth/me"),

  updateProfile: (input: {
    name?: string;
    avatarUrl?: string | null;
    notificationPrefs?: NotificationPrefs;
  }) =>
    request<PublicUser>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteAccount: (confirmEmail: string) =>
    request<void>("/auth/me", {
      method: "DELETE",
      body: JSON.stringify({ confirmEmail }),
    }),

  listOrgs: () => request<OrgSummary[]>("/orgs"),

  createOrg: (input: { name: string; slug: string }) =>
    request<{ id: string; name: string; slug: string }>("/orgs", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateOrg: (orgId: string, input: { name: string }) =>
    request<{ id: string; name: string; slug: string }>(`/orgs/${orgId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteOrg: (orgId: string) => request<void>(`/orgs/${orgId}`, { method: "DELETE" }),

  exportOrgData: (orgId: string) => request<Record<string, unknown>>(`/orgs/${orgId}/export`),

  listProjects: (orgId: string) => request<Project[]>(`/orgs/${orgId}/projects`),

  getProject: (projectId: string) => request<Project>(`/projects/${projectId}`),

  listProjectMembers: (projectId: string) =>
    request<ProjectMemberSummary[]>(`/projects/${projectId}/members`),

  createProject: (
    orgId: string,
    input: { name: string; slug: string; description?: string }
  ) =>
    request<CreateProjectResult>(`/orgs/${orgId}/projects`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listProjectCreationRequests: (orgId: string) =>
    request<ProjectCreationRequestSummary[]>(`/orgs/${orgId}/project-creation-requests`),

  approveProjectCreationRequest: (orgId: string, requestId: string) =>
    request<Project>(`/orgs/${orgId}/project-creation-requests/${requestId}/approve`, {
      method: "POST",
    }),

  rejectProjectCreationRequest: (orgId: string, requestId: string) =>
    request<void>(`/orgs/${orgId}/project-creation-requests/${requestId}/reject`, {
      method: "POST",
    }),

  listCreateAutoApproveRules: (orgId: string) =>
    request<ProjectCreateAutoApproveRuleSummary[]>(
      `/orgs/${orgId}/project-create-auto-approve`
    ),

  enableCreateAutoApprove: (orgId: string, adminId: string) =>
    request<void>(`/orgs/${orgId}/project-create-auto-approve/${adminId}`, {
      method: "POST",
    }),

  disableCreateAutoApprove: (orgId: string, adminId: string) =>
    request<void>(`/orgs/${orgId}/project-create-auto-approve/${adminId}`, {
      method: "DELETE",
    }),

  updateProject: (projectId: string, input: { name: string; description?: string }) =>
    request<Project>(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteProject: (projectId: string) =>
    request<void>(`/projects/${projectId}`, { method: "DELETE" }),

  listEnvironments: (projectId: string) =>
    request<EnvironmentSummary[]>(`/projects/${projectId}/environments`),

  getEnvironment: (environmentId: string) =>
    request<EnvironmentSummary>(`/environments/${environmentId}`),

  deleteEnvironment: (environmentId: string) =>
    request<void>(`/environments/${environmentId}`, { method: "DELETE" }),

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

  listDeletedSecrets: (environmentId: string) =>
    request<DeletedSecretMetadata[]>(`/environments/${environmentId}/secrets/deleted`),

  restoreDeletedSecret: (secretId: string) =>
    request<SecretMetadata>(`/secrets/${secretId}/restore`, { method: "POST" }),

  listMembers: (orgId: string) => request<MemberSummary[]>(`/orgs/${orgId}/members`),

  checkEmailExists: (orgId: string, email: string) =>
    request<{ exists: boolean }>(
      `/orgs/${orgId}/members/check-email?email=${encodeURIComponent(email)}`
    ),

  removeMember: (orgId: string, membershipId: string) =>
    request<void>(`/orgs/${orgId}/members/${membershipId}`, { method: "DELETE" }),

  grantProjectAccess: (orgId: string, membershipId: string, projectId: string, role: ProjectRole) =>
    request<void>(`/orgs/${orgId}/members/${membershipId}/projects/${projectId}`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),

  revokeProjectAccess: (orgId: string, membershipId: string, projectId: string) =>
    request<void>(`/orgs/${orgId}/members/${membershipId}/projects/${projectId}`, {
      method: "DELETE",
    }),

  setCanViewAllProjects: (orgId: string, membershipId: string, canViewAllProjects: boolean) =>
    request<{ id: string; canViewAllProjects: boolean }>(
      `/orgs/${orgId}/members/${membershipId}/view-all`,
      {
        method: "PATCH",
        body: JSON.stringify({ canViewAllProjects }),
      }
    ),

  leaveOrganization: (orgId: string) =>
    request<void>(`/orgs/${orgId}/leave`, { method: "POST" }),

  leaveProject: (orgId: string, projectId: string) =>
    request<void>(`/orgs/${orgId}/projects/${projectId}/leave`, { method: "POST" }),

  transferOwnership: (orgId: string, membershipId: string) =>
    request<void>(`/orgs/${orgId}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ membershipId }),
    }),

  requestProjectAccess: (orgId: string, projectId: string, requestedRole: ProjectRole) =>
    request<{ id: string }>(`/orgs/${orgId}/projects/${projectId}/access-requests`, {
      method: "POST",
      body: JSON.stringify({ requestedRole }),
    }),

  listAccessRequests: (orgId: string) =>
    request<ProjectAccessRequestSummary[]>(`/orgs/${orgId}/project-access-requests`),

  approveAccessRequest: (orgId: string, requestId: string) =>
    request<void>(`/orgs/${orgId}/project-access-requests/${requestId}/approve`, {
      method: "POST",
    }),

  rejectAccessRequest: (orgId: string, requestId: string) =>
    request<void>(`/orgs/${orgId}/project-access-requests/${requestId}/reject`, {
      method: "POST",
    }),

  listAuditLogs: (
    orgId: string,
    params?: {
      projectId?: string;
      action?: string;
      actorId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      page?: number;
    }
  ) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", params.projectId);
    if (params?.action) qs.set("action", params.action);
    if (params?.actorId) qs.set("actorId", params.actorId);
    if (params?.startDate) qs.set("startDate", params.startDate);
    if (params?.endDate) qs.set("endDate", params.endDate);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.page) qs.set("page", String(params.page));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<AuditLogEntry[] | PaginatedAuditLogs>(`/orgs/${orgId}/audit-logs${suffix}`);
  },

  purgeAuditLogs: (orgId: string, before: string) =>
    request<{ deletedCount: number }>(
      `/orgs/${orgId}/audit-logs?before=${encodeURIComponent(before)}`,
      { method: "DELETE" }
    ),

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

  dismissNotification: (notificationId: string) =>
    request<void>(`/notifications/${notificationId}`, { method: "DELETE" }),

  clearAllNotifications: () => request<void>("/notifications", { method: "DELETE" }),

  getPermissionMatrix: (orgId: string) =>
    request<PermissionMatrix>(`/orgs/${orgId}/permissions`),

  setPermissionOverride: (
    orgId: string,
    input: { role: ProjectRole; environmentType: EnvironmentType; access: EnvironmentAccessLevel | null }
  ) =>
    request<PermissionMatrix>(`/orgs/${orgId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  createInvite: (orgId: string, input: { email: string; projectId?: string; role?: ProjectRole }) =>
    request<InviteCreated>(`/orgs/${orgId}/invites`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  listInvites: (orgId: string) => request<InviteSummary[]>(`/orgs/${orgId}/invites`),

  getInviteByToken: (token: string) => request<PublicInvite>(`/invites/${token}`),

  acceptInvite: (token: string) =>
    request<MemberSummary>(`/invites/${token}/accept`, { method: "POST" }),

};
