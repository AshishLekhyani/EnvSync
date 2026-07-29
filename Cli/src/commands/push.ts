import fs from "node:fs";
import path from "node:path";
import { apiRequest } from "../apiClient";
import { resolveEnvironment } from "../environment";
import { parseProjectEnvFlags } from "../flags";
import { requireSession } from "../session";

interface BulkUpsertResult {
  key: string;
  action: "created" | "updated";
}

function parseEnvFile(outPath: string): { key: string; value: string }[] {
  if (!fs.existsSync(outPath)) {
    console.error(`No such file: ${outPath}`);
    process.exit(1);
  }

  const entries: { key: string; value: string }[] = [];
  const contents = fs.readFileSync(outPath, "utf8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    entries.push({ key: trimmed.slice(0, eq), value: trimmed.slice(eq + 1) });
  }

  return entries;
}

export async function runPush(args: string[]): Promise<void> {
  const { projectId, environmentId, out } = parseProjectEnvFlags(args);
  const credentials = requireSession();
  await resolveEnvironment(credentials, projectId, environmentId);

  const outPath = path.resolve(out ?? ".env");
  const entries = parseEnvFile(outPath);

  if (entries.length === 0) {
    console.log(`No key=value pairs found in ${outPath}`);
    return;
  }

  const results = await apiRequest<BulkUpsertResult[]>(
    credentials.token,
    credentials.apiUrl,
    `/environments/${environmentId}/secrets/bulk`,
    { method: "POST", body: { secrets: entries } }
  );

  const created = results.filter((r) => r.action === "created").length;
  const updated = results.filter((r) => r.action === "updated").length;
  console.log(`Pushed ${outPath}: ${created} created, ${updated} updated.`);
}
