import { Credentials, readCredentials } from "./credentials";
import { resolveApiUrl } from "./apiClient";

export function requireSession(): Credentials {
  const envToken = process.env.ENVSYNC_TOKEN;
  if (envToken) {
    return { token: envToken, apiUrl: resolveApiUrl(), user: { id: "", email: "", name: "" } };
  }

  const credentials = readCredentials();

  if (!credentials) {
    console.error("Not logged in. Run `envsync login <token>` or set ENVSYNC_TOKEN.");
    process.exit(1);
  }

  return credentials;
}
