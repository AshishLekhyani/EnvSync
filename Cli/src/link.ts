import fs from "node:fs";
import path from "node:path";

const LINK_FILENAME = ".envsync.json";

export interface ProjectLink {
  projectId: string;
  environmentId: string;
  lastPulledAt?: string;
}

function linkPath(): string {
  return path.join(process.cwd(), LINK_FILENAME);
}

export function readLink(): ProjectLink | null {
  try {
    const raw = fs.readFileSync(linkPath(), "utf8");
    return JSON.parse(raw) as ProjectLink;
  } catch {
    return null;
  }
}

export function writeLink(link: ProjectLink): void {
  fs.writeFileSync(linkPath(), JSON.stringify(link, null, 2) + "\n");
}

export function recordPull(projectId: string, environmentId: string): void {
  const link = readLink();
  if (!link || link.projectId !== projectId || link.environmentId !== environmentId) {
    return;
  }
  writeLink({ ...link, lastPulledAt: new Date().toISOString() });
}
