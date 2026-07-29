const DEFAULT_API_URL = "http://localhost:4000/api";

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

export function resolveApiUrl(): string {
  return process.env.ENVSYNC_API_URL ?? DEFAULT_API_URL;
}
