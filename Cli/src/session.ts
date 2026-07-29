import { Credentials, readCredentials } from "./credentials";

export function requireSession(): Credentials {
  const credentials = readCredentials();

  if (!credentials) {
    console.error("Not logged in. Run `envsync login <token>` first.");
    process.exit(1);
  }

  return credentials;
}
