export interface SecretMetadata {
  id: string;
  key: string;
  currentVersion: number;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecretWithValue extends SecretMetadata {
  value: string;
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  // Absent (older API) means access; false means visible-but-not-yet-granted
  // (Admin/Developer can browse the full org project list and request
  // access, but can't pull/push/run against one until it's granted).
  hasAccess?: boolean;
}

export interface EnvironmentSummary {
  id: string;
  projectId: string;
  type: string;
  name: string;
}
