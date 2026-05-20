#!/usr/bin/env node
import { promises as fs } from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import {
  DEFAULT_REDIRECT_URI,
  DEFAULT_SCOPES,
  buildAuthorizeUrl,
  exchangeCode,
  randomState,
  tokensFromResponse,
} from "../oauth.js";
import { defaultTokenPath, saveTokens } from "../token-store.js";

async function loadDotEnv(file = ".env"): Promise<void> {
  let text: string;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function openBrowser(url: string): void {
  let cmd: string;
  let args: string[];
  if (process.platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (process.platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  try {
    const proc = spawn(cmd, args, { stdio: "ignore", detached: true });
    proc.unref();
  } catch {
    // best-effort; URL is also printed for manual paste
  }
}

interface CallbackResult {
  code: string;
}

function runCallbackServer(
  redirect: URL,
  expectedState: string,
  authUrl: string,
): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400).end("bad request");
        return;
      }
      const reqUrl = new URL(req.url, `http://${req.headers.host}`);
      if (reqUrl.pathname !== redirect.pathname) {
        res.writeHead(404).end("not found");
        return;
      }
      const code = reqUrl.searchParams.get("code");
      const state = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");
      if (error) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end(`OAuth error: ${error}`);
        server.close();
        reject(new Error(`Pinterest returned error: ${error}`));
        return;
      }
      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end("state mismatch");
        server.close();
        reject(new Error("OAuth state mismatch, possible CSRF"));
        return;
      }
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/plain" }).end("missing code");
        server.close();
        reject(new Error("Pinterest callback did not include code"));
        return;
      }
      res
        .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
        .end(
          '<!doctype html><html><body style="font-family:system-ui;padding:40px;max-width:560px">' +
            "<h1>Authorized.</h1><p>You can close this tab and return to the terminal.</p>" +
            "</body></html>",
        );
      server.close();
      resolve({ code });
    });

    const port = redirect.port
      ? Number(redirect.port)
      : redirect.protocol === "https:"
        ? 443
        : 80;
    const host = redirect.hostname || "127.0.0.1";

    server.on("error", reject);
    server.listen(port, host, () => {
      console.log(`Listening on http://${host}:${port}${redirect.pathname} for Pinterest callback.`);
      console.log("\nIf the browser does not open, paste this URL:");
      console.log(authUrl);
      console.log();
      openBrowser(authUrl);
    });
  });
}

async function main(): Promise<void> {
  await loadDotEnv();

  const client_id = process.env.PINTEREST_CLIENT_ID;
  const client_secret = process.env.PINTEREST_CLIENT_SECRET;
  const redirect_uri = process.env.PINTEREST_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;

  if (!client_id || !client_secret) {
    console.error("Missing PINTEREST_CLIENT_ID and/or PINTEREST_CLIENT_SECRET.");
    console.error("Set them in your shell, in a .env in the project root, or pass them inline:");
    console.error("  PINTEREST_CLIENT_ID=... PINTEREST_CLIENT_SECRET=... npm run auth");
    process.exit(1);
  }

  const redirect = new URL(redirect_uri);
  if (!["http:", "https:"].includes(redirect.protocol)) {
    throw new Error(`redirect_uri must be http or https, got: ${redirect_uri}`);
  }

  const state = randomState();
  const cfg = { client_id, client_secret, redirect_uri, scopes: DEFAULT_SCOPES };
  const authUrl = buildAuthorizeUrl(cfg, state);

  const { code } = await runCallbackServer(redirect, state, authUrl);
  console.log("Exchanging authorization code for tokens.");

  const resp = await exchangeCode(cfg, code);
  const tokens = tokensFromResponse(resp);
  const path = defaultTokenPath();
  await saveTokens(tokens, path);

  console.log(`\nSaved tokens to ${path}`);
  console.log(`Access token expires at ${new Date(tokens.expires_at * 1000).toISOString()}.`);
  if (tokens.refresh_expires_at) {
    console.log(`Refresh token expires at ${new Date(tokens.refresh_expires_at * 1000).toISOString()}.`);
  }
  console.log("\nThe MCP server will refresh the access token automatically when it expires.");
}

main().catch((err) => {
  console.error(`Auth failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
