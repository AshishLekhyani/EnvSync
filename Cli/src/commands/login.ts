import { apiRequest, resolveApiUrl } from "../apiClient";
import { writeCredentials } from "../credentials";

interface MeResponse {
  id: string;
  email: string;
  name: string;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

export async function runLogin(args: string[]): Promise<void> {
  let token = args[0];

  if (!token && !process.stdin.isTTY) {
    token = await readStdin();
  }

  if (!token) {
    console.error("Usage: envsync login <token>\n   or: echo $TOKEN | envsync login");
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
