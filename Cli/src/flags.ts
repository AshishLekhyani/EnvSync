import { parseArgs } from "node:util";
import { readLink } from "./link";

export interface ProjectEnvFlags {
  projectId: string;
  environmentId: string;
  out?: string;
}

export function parseProjectEnvFlags(argv: string[]): ProjectEnvFlags {
  const { values } = parseArgs({
    args: argv,
    options: {
      project: { type: "string" },
      environment: { type: "string" },
      out: { type: "string" },
    },
  });

  let projectId = values.project;
  let environmentId = values.environment;

  if (!projectId || !environmentId) {
    const link = readLink();
    projectId = projectId ?? link?.projectId;
    environmentId = environmentId ?? link?.environmentId;
  }

  if (!projectId || !environmentId) {
    console.error(
      "No project/environment specified. Pass --project <id> --environment <id>, or run `envsync link --project <id> --environment <id>` once in this folder."
    );
    process.exit(1);
  }

  return { projectId, environmentId, out: values.out };
}
