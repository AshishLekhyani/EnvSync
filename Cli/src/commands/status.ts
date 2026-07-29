import fs from "node:fs";
import path from "node:path";
import { apiRequest } from "../apiClient";
import { resolveEnvironment } from "../environment";
import { parseProjectEnvFlags } from "../flags";
import { requireSession } from "../session";
import { SecretMetadata } from "../types";

function readLocalKeys(outPath: string): Set<string> {
  const keys = new Set<string>();

  if (!fs.existsSync(outPath)) {
    return keys;
  }

  const contents = fs.readFileSync(outPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) keys.add(trimmed.slice(0, eq));
  }

  return keys;
}

export async function runStatus(args: string[]): Promise<void> {
  const { projectId, environmentId, out } = parseProjectEnvFlags(args);
  const credentials = requireSession();
  await resolveEnvironment(credentials, projectId, environmentId);

  const secrets = await apiRequest<SecretMetadata[]>(
    credentials.token,
    credentials.apiUrl,
    `/environments/${environmentId}/secrets`
  );
  const remoteKeys = new Set(secrets.map((s) => s.key));

  const outPath = path.resolve(out ?? ".env");
  const localKeys = readLocalKeys(outPath);

  const toAdd = [...remoteKeys].filter((k) => !localKeys.has(k)).sort();
  const toRemove = [...localKeys].filter((k) => !remoteKeys.has(k)).sort();

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log(`${outPath} is in sync with ${remoteKeys.size} remote secret(s).`);
    return;
  }

  if (toAdd.length > 0) {
    console.log(`Would be added by pull (${toAdd.length}):`);
    toAdd.forEach((k) => console.log(`  + ${k}`));
  }

  if (toRemove.length > 0) {
    console.log(`Local-only, would be removed by pull (${toRemove.length}):`);
    toRemove.forEach((k) => console.log(`  - ${k}`));
  }
}
