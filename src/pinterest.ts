const DEFAULT_BASE = "https://api.pinterest.com";

export class PinterestApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "PinterestApiError";
    this.status = status;
    this.body = body;
  }
}

export interface PinterestClientOptions {
  token: string;
  baseUrl?: string;
}

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export class PinterestClient {
  private token: string;
  private baseUrl: string;

  constructor(opts: PinterestClientOptions) {
    if (!opts.token) {
      throw new Error("PINTEREST_ACCESS_TOKEN is required");
    }
    this.token = opts.token;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE).replace(/\/+$/, "");
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(k, String(item));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return url.toString();
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    opts: { query?: Record<string, unknown>; body?: Json } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let parsed: unknown = undefined;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!res.ok) {
      const msg =
        (parsed && typeof parsed === "object" && "message" in (parsed as object)
          ? String((parsed as { message: unknown }).message)
          : `Pinterest API ${method} ${path} failed with ${res.status}`);
      throw new PinterestApiError(res.status, parsed, msg);
    }
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Record<string, unknown>) {
    return this.request<T>("GET", path, { query });
  }

  post<T = unknown>(path: string, body?: Json, query?: Record<string, unknown>) {
    return this.request<T>("POST", path, { body, query });
  }

  patch<T = unknown>(path: string, body?: Json, query?: Record<string, unknown>) {
    return this.request<T>("PATCH", path, { body, query });
  }

  delete<T = unknown>(path: string, query?: Record<string, unknown>) {
    return this.request<T>("DELETE", path, { query });
  }
}

export function clientFromEnv(): PinterestClient {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "PINTEREST_ACCESS_TOKEN is not set. Generate a token at https://developers.pinterest.com/apps/ and set it in the MCP server config env.",
    );
  }
  return new PinterestClient({
    token,
    baseUrl: process.env.PINTEREST_API_BASE,
  });
}
