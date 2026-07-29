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
}

export interface EnvironmentSummary {
  id: string;
  projectId: string;
  type: string;
  name: string;
}
