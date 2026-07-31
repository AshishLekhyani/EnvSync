import fs from "node:fs";
import path from "node:path";
import { apiRequest } from "../apiClient";
import { resolveEnvironment } from "../environment";
import { parseProjectEnvFlags } from "../flags";
import { readLink } from "../link";
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

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export async function runStatus(args: string[]): Promise<void> {
  const { projectId, environmentId, out } = parseProjectEnvFlags(args);
  const credentials = requireSession();
  const environment = await resolveEnvironment(credentials, projectId, environmentId);

  const secrets = await apiRequest<SecretMetadata[]>(
    credentials.token,
    credentials.apiUrl,
    `/environments/${environmentId}/secrets`
  );
  const remoteByKey = new Map(secrets.map((s) => [s.key, s]));

  const outPath = path.resolve(out ?? ".env");
  const localKeys = readLocalKeys(outPath);

  const inSync = secrets.filter((s) => localKeys.has(s.key)).sort((a, b) => a.key.localeCompare(b.key));
  const toAdd = [...remoteByKey.keys()].filter((k) => !localKeys.has(k)).sort();
  const toRemove = [...localKeys].filter((k) => !remoteByKey.has(k)).sort();

  console.log(`${environment.name} (${environment.type}) vs ${outPath}\n`);

  const link = readLink();
  const lastPulledAt =
    link && link.projectId === projectId && link.environmentId === environmentId
      ? link.lastPulledAt
      : undefined;

  if (inSync.length > 0) {
    console.log(`In sync (${inSync.length}):`);
    for (const s of inSync) {
      const changedSincePull = lastPulledAt && new Date(s.updatedAt) > new Date(lastPulledAt);
      const flag = changedSincePull ? "  [changed remotely since your last pull]" : "";
      console.log(`  ${s.key}  updated ${timeAgo(s.updatedAt)}${flag}`);
    }
    console.log("");
  }

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log(`Nothing to add or remove — ${remoteByKey.size} remote secret(s), all present locally.`);
    return;
  }

  if (toAdd.length > 0) {
    console.log(`Would be added by pull (${toAdd.length}):`);
    toAdd.forEach((k) => {
      const s = remoteByKey.get(k)!;
      console.log(`  + ${k}  updated ${timeAgo(s.updatedAt)}`);
    });
    console.log("");
  }

  if (toRemove.length > 0) {
    console.log(`Local-only, would be removed by pull (${toRemove.length}):`);
    toRemove.forEach((k) => console.log(`  - ${k}`));
  }
}
