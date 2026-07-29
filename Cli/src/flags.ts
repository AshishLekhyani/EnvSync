import { parseArgs } from "node:util";

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

  if (!values.project || !values.environment) {
    console.error("Both --project <id> and --environment <id> are required.");
    process.exit(1);
  }

  return { projectId: values.project, environmentId: values.environment, out: values.out };
}
