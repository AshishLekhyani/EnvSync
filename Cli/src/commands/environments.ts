import { parseArgs } from "node:util";
import { apiRequest } from "../apiClient";
import { requireSession } from "../session";
import { EnvironmentSummary } from "../types";

export async function runEnvironments(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { project: { type: "string" } },
  });

  if (!values.project) {
    console.error("Usage: envsync environments --project <id>");
    process.exit(1);
  }

  const credentials = requireSession();
  const environments = await apiRequest<EnvironmentSummary[]>(
    credentials.token,
    credentials.apiUrl,
    `/projects/${values.project}/environments`
  );

  for (const environment of environments) {
    console.log(`${environment.name}  (${environment.type})  ${environment.id}`);
  }
}
