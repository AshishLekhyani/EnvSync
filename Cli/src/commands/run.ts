import spawn from "cross-spawn";
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

  const onSigint = () => child.kill("SIGINT");
  const onSigterm = () => child.kill("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  try {
    const code = await new Promise<number>((resolve) => {
      child.on("error", (err) => {
        console.error(`Failed to run "${command}": ${err.message}`);
        resolve(1);
      });
      child.on("exit", (code) => resolve(code ?? 0));
    });
    process.exitCode = code;
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }
}
