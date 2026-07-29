import { apiRequest, resolveApiUrl } from "../apiClient";
import { writeCredentials } from "../credentials";

interface MeResponse {
  id: string;
  email: string;
  name: string;
}

export async function runLogin(args: string[]): Promise<void> {
  const token = args[0];

  if (!token) {
    console.error("Usage: envsync login <token>");
    process.exit(1);
  }

  const apiUrl = resolveApiUrl();

  try {
    const me = await apiRequest<MeResponse>(token, apiUrl, "/auth/me");
    writeCredentials({
      token,
      apiUrl,
      user: { id: me.id, email: me.email, name: me.name },
    });
    console.log(`Logged in as ${me.email}`);
  } catch {
    console.error("Login failed: invalid or revoked token");
    process.exit(1);
  }
}
