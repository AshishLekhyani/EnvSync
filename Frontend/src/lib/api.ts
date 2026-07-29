const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

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

  createSecret: (environmentId: string, input: { key: string; value: string }) =>
    request<SecretMetadata>(`/environments/${environmentId}/secrets`, {
      method: "POST",
      body: JSON.stringify(input),
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
};
