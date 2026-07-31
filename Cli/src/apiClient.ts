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

const SLOW_THRESHOLD_MS = 3500;
const MAX_ATTEMPTS = 6;
const RETRY_DELAY_MS = 5000;

let warnedSlow = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiRequest<T>(
  token: string,
  apiUrl: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const slowTimer = warnedSlow
      ? null
      : setTimeout(() => {
          warnedSlow = true;
          console.error(
            "Waking up the server -- free-tier hosting sleeps when idle, this can take up to a minute..."
          );
        }, SLOW_THRESHOLD_MS);

    try {
      const res = await fetch(`${apiUrl}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      if (slowTimer) clearTimeout(slowTimer);

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
    } catch (err) {
      if (slowTimer) clearTimeout(slowTimer);

      if (err instanceof ApiError) {
        throw err;
      }

      if (attempt === MAX_ATTEMPTS) {
        throw new Error(
          `Could not reach ${apiUrl} after ${MAX_ATTEMPTS} attempts. Check your connection or ENVSYNC_API_URL.`
        );
      }

      await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error("unreachable");
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
