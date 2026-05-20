import {
  defaultTokenPath,
  loadTokens,
  saveTokens,
  type StoredTokens,
} from "./token-store.js";
import { nowSeconds, refreshAccessToken, tokensFromResponse } from "./oauth.js";

const DEFAULT_BASE = "https://api.pinterest.com";
const EXPIRY_SKEW_SECONDS = 60;

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

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface TokenProvider {
  getAccessToken(): Promise<string>;
  refresh?(): Promise<string>;
}

export class StaticTokenProvider implements TokenProvider {
  constructor(private token: string) {
    if (!token) throw new Error("StaticTokenProvider requires a non-empty token");
  }
  async getAccessToken(): Promise<string> {
    return this.token;
  }
}

export interface RefreshingTokenProviderOptions {
  client_id: string;
  client_secret: string;
  tokenPath?: string;
  initial?: StoredTokens;
}

export class RefreshingTokenProvider implements TokenProvider {
  private tokens: StoredTokens | null = null;
  private tokenPath: string;
  private clientId: string;
  private clientSecret: string;
  private inflightRefresh: Promise<string> | null = null;

  constructor(opts: RefreshingTokenProviderOptions) {
    if (!opts.client_id) throw new Error("PINTEREST_CLIENT_ID is required for OAuth refresh");
    if (!opts.client_secret) throw new Error("PINTEREST_CLIENT_SECRET is required for OAuth refresh");
    this.clientId = opts.client_id;
    this.clientSecret = opts.client_secret;
    this.tokenPath = opts.tokenPath ?? defaultTokenPath();
    if (opts.initial) this.tokens = opts.initial;
  }

  private async ensureLoaded(): Promise<StoredTokens> {
    if (!this.tokens) {
      this.tokens = await loadTokens(this.tokenPath);
    }
    if (!this.tokens) {
      throw new Error(
        `No Pinterest tokens found at ${this.tokenPath}. Run 'npx claude-pinterest-auth' to authorize.`,
      );
    }
    return this.tokens;
  }

  async getAccessToken(): Promise<string> {
    const tokens = await this.ensureLoaded();
    if (tokens.expires_at - nowSeconds() < EXPIRY_SKEW_SECONDS) {
      return this.refresh();
    }
    return tokens.access_token;
  }

  async refresh(): Promise<string> {
    if (this.inflightRefresh) return this.inflightRefresh;
    this.inflightRefresh = (async () => {
      try {
        const tokens = await this.ensureLoaded();
        if (!tokens.refresh_token) {
          throw new Error(
            "Stored token file has no refresh_token. Re-run 'npx claude-pinterest-auth'.",
          );
        }
        const resp = await refreshAccessToken(
          { client_id: this.clientId, client_secret: this.clientSecret },
          tokens.refresh_token,
        );
        const next = tokensFromResponse(resp, tokens);
        this.tokens = next;
        await saveTokens(next, this.tokenPath);
        return next.access_token;
      } finally {
        this.inflightRefresh = null;
      }
    })();
    return this.inflightRefresh;
  }
}

export interface PinterestClientOptions {
  provider: TokenProvider;
  baseUrl?: string;
}

export class PinterestClient {
  private provider: TokenProvider;
  private baseUrl: string;

  constructor(opts: PinterestClientOptions) {
    this.provider = opts.provider;
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

  private async send(
    method: string,
    url: string,
    body: string | undefined,
    token: string,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    return fetch(url, { method, headers, body });
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    opts: { query?: Record<string, unknown>; body?: Json } = {},
  ): Promise<T> {
    const url = this.buildUrl(path, opts.query);
    const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

    let token = await this.provider.getAccessToken();
    let res = await this.send(method, url, body, token);

    if (res.status === 401 && this.provider.refresh) {
      token = await this.provider.refresh();
      res = await this.send(method, url, body, token);
    }

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
        parsed && typeof parsed === "object" && "message" in (parsed as object)
          ? String((parsed as { message: unknown }).message)
          : `Pinterest API ${method} ${path} failed with ${res.status}`;
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
  const baseUrl = process.env.PINTEREST_API_BASE;
  const staticToken = process.env.PINTEREST_ACCESS_TOKEN;
  if (staticToken) {
    return new PinterestClient({
      provider: new StaticTokenProvider(staticToken),
      baseUrl,
    });
  }
  const client_id = process.env.PINTEREST_CLIENT_ID;
  const client_secret = process.env.PINTEREST_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    throw new Error(
      "No Pinterest credentials. Either set PINTEREST_ACCESS_TOKEN (one-shot mode), " +
        "or set PINTEREST_CLIENT_ID + PINTEREST_CLIENT_SECRET and run 'npx claude-pinterest-auth' to authorize.",
    );
  }
  return new PinterestClient({
    provider: new RefreshingTokenProvider({ client_id, client_secret }),
    baseUrl,
  });
}
