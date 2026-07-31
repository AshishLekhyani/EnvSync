import { parseArgs } from "node:util";
import { writeLink } from "../link";

export async function runLink(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: "string" },
      environment: { type: "string" },
    },
  });

  if (!values.project || !values.environment) {
    console.error("Usage: envsync link --project <id> --environment <id>");
    process.exit(1);
  }

  writeLink({ projectId: values.project, environmentId: values.environment });
  console.log(
    `Linked this folder to project ${values.project}, environment ${values.environment}.\nFuture commands here no longer need --project/--environment.`
  );
}
