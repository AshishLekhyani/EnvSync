import { apiRequest } from "./apiClient";
import { Credentials } from "./credentials";
import { EnvironmentSummary } from "./types";

export async function resolveEnvironment(
  credentials: Credentials,
  projectId: string,
  environmentId: string
): Promise<EnvironmentSummary> {
  const environment = await apiRequest<EnvironmentSummary>(
    credentials.token,
    credentials.apiUrl,
    `/environments/${environmentId}`
  );

  if (environment.projectId !== projectId) {
    console.error(`Environment ${environmentId} does not belong to project ${projectId}.`);
    process.exit(1);
  }

  return environment;
}
