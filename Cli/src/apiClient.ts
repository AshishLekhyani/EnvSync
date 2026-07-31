const DEFAULT_API_URL = "https://envsync-api.onrender.com/api";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiRequest<T>(
  token: string,
  apiUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const res = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null;

  if (!res.ok) {
    const message = data?.error?.message ?? "Request failed";
    const code = data?.error?.code ?? "UNKNOWN";
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}

let warnedInsecure = false;

export function resolveApiUrl(): string {
  const url = process.env.ENVSYNC_API_URL ?? DEFAULT_API_URL;

  if (!warnedInsecure) {
    try {
      const parsed = new URL(url);
      const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (parsed.protocol !== "https:" && !isLocal) {
        console.error(
          `Warning: ENVSYNC_API_URL (${url}) is not HTTPS. Your token and secrets would be sent in the clear.`
        );
        warnedInsecure = true;
      }
    } catch {
      /* malformed URL -- the request itself will fail with a clear error */
    }
  }

  return url;
}
