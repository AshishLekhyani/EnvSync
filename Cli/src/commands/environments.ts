import { parseArgs } from "node:util";
import { apiRequest } from "../apiClient";
import { readLink } from "../link";
import { requireSession } from "../session";
import { EnvironmentSummary } from "../types";

export async function runEnvironments(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { project: { type: "string" } },
  });

  const projectId = values.project ?? readLink()?.projectId;

  if (!projectId) {
    console.error(
      "Usage: envsync environments --project <id> (or run `envsync link` first)"
    );
    process.exit(1);
  }

  const credentials = requireSession();
  const environments = await apiRequest<EnvironmentSummary[]>(
    credentials.token,
    credentials.apiUrl,
    `/projects/${projectId}/environments`
  );

  for (const environment of environments) {
    console.log(`${environment.name}  (${environment.type})  ${environment.id}`);
  }
}
