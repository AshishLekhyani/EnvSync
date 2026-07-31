import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CONFIG_DIR = path.join(os.homedir(), ".envsync");
const CREDENTIALS_PATH = path.join(CONFIG_DIR, "credentials.json");

export interface Credentials {
  token: string;
  apiUrl: string;
  user: { id: string; email: string; name: string };
}

export function readCredentials(): Credentials | null {
  try {
    const raw = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    return JSON.parse(raw) as Credentials;
  } catch {
    return null;
  }
}

export function writeCredentials(credentials: Credentials): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), {
    mode: 0o600,
  });
}

export function clearCredentials(): void {
  try {
    fs.unlinkSync(CREDENTIALS_PATH);
  } catch {
    return;
  }
}
