import { apiRequest } from "../apiClient";
import { requireSession } from "../session";
import { OrgSummary, ProjectSummary } from "../types";

export async function runProjects(): Promise<void> {
  const credentials = requireSession();
  const orgs = await apiRequest<OrgSummary[]>(credentials.token, credentials.apiUrl, "/orgs");

  if (orgs.length === 0) {
    console.log("No organizations found.");
    return;
  }

  for (const org of orgs) {
    const projects = await apiRequest<ProjectSummary[]>(
      credentials.token,
      credentials.apiUrl,
      `/orgs/${org.id}/projects`
    );

    console.log(`${org.name}  (${org.id})`);
    for (const project of projects) {
      console.log(`  ${project.name}  ${project.id}`);
    }
  }
}
