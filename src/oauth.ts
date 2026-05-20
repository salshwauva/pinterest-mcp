import { randomBytes } from "node:crypto";
import type { StoredTokens } from "./token-store.js";

const AUTHORIZE_URL = "https://www.pinterest.com/oauth/";
const TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

export const DEFAULT_SCOPES = [
  "pins:read",
  "pins:write",
  "boards:read",
  "boards:write",
  "user_accounts:read",
];

export const DEFAULT_REDIRECT_URI = "http://localhost:8788/callback";

export interface OAuthClientConfig {
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes?: string[];
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  scope?: string;
}

export class OAuthError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "OAuthError";
    this.status = status;
    this.body = body;
  }
}

export function buildAuthorizeUrl(cfg: OAuthClientConfig, state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", cfg.client_id);
  url.searchParams.set("redirect_uri", cfg.redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (cfg.scopes ?? DEFAULT_SCOPES).join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

export function randomState(): string {
  return randomBytes(16).toString("hex");
}

async function postToken(
  body: URLSearchParams,
  creds: { client_id: string; client_secret: string },
): Promise<OAuthTokenResponse> {
  const basic = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && "message" in (parsed as object)
        ? String((parsed as { message: unknown }).message)
        : `Pinterest token endpoint returned ${res.status}`;
    throw new OAuthError(res.status, parsed, msg);
  }
  return parsed as OAuthTokenResponse;
}

export function exchangeCode(
  cfg: OAuthClientConfig,
  code: string,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams();
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", cfg.redirect_uri);
  return postToken(body, cfg);
}

export interface RefreshOptions {
  refresh_on?: "ACCESS_TOKEN" | "REFRESH_TOKEN";
  scope?: string;
}

export function refreshAccessToken(
  creds: { client_id: string; client_secret: string },
  refresh_token: string,
  opts: RefreshOptions = {},
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refresh_token);
  if (opts.refresh_on) body.set("refresh_on", opts.refresh_on);
  if (opts.scope) body.set("scope", opts.scope);
  return postToken(body, creds);
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function tokensFromResponse(
  resp: OAuthTokenResponse,
  prev?: Pick<StoredTokens, "refresh_token" | "refresh_expires_at">,
): StoredTokens {
  const now = nowSeconds();
  return {
    access_token: resp.access_token,
    refresh_token: resp.refresh_token ?? prev?.refresh_token ?? "",
    expires_at: now + resp.expires_in,
    refresh_expires_at: resp.refresh_token_expires_in
      ? now + resp.refresh_token_expires_in
      : prev?.refresh_expires_at,
    scope: resp.scope,
    token_type: resp.token_type,
    obtained_at: now,
  };
}
