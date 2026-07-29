import { spawn } from "node:child_process";
import { apiRequest } from "../apiClient";
import { resolveEnvironment } from "../environment";
import { parseProjectEnvFlags } from "../flags";
import { requireSession } from "../session";
import { SecretMetadata, SecretWithValue } from "../types";

export async function runRun(argv: string[]): Promise<void> {
  const dashIndex = argv.indexOf("--");

  if (dashIndex === -1 || dashIndex === argv.length - 1) {
    console.error(
      "Usage: envsync run --project <id> --environment <id> -- <command> [args...]"
    );
    process.exit(1);
  }

  const flagArgs = argv.slice(0, dashIndex);
  const [command, ...commandArgs] = argv.slice(dashIndex + 1);

  const { projectId, environmentId } = parseProjectEnvFlags(flagArgs);
  const credentials = requireSession();
  await resolveEnvironment(credentials, projectId, environmentId);

  const secrets = await apiRequest<SecretMetadata[]>(
    credentials.token,
    credentials.apiUrl,
    `/environments/${environmentId}/secrets`
  );

  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const secret of secrets) {
    const result = await apiRequest<SecretWithValue>(
      credentials.token,
      credentials.apiUrl,
      `/secrets/${secret.id}/reveal`
    );
    env[secret.key] = result.value;
  }

  const child = spawn(command, commandArgs, { env, stdio: "inherit" });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));

  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}
