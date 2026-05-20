import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  refresh_expires_at?: number;
  scope?: string;
  token_type?: string;
  obtained_at?: number;
}

export function defaultTokenPath(): string {
  if (process.env.PINTEREST_TOKEN_PATH) {
    return process.env.PINTEREST_TOKEN_PATH;
  }
  return join(homedir(), ".config", "claude-pinterest", "tokens.json");
}

export async function loadTokens(
  path: string = defaultTokenPath(),
): Promise<StoredTokens | null> {
  try {
    const data = await fs.readFile(path, "utf8");
    return JSON.parse(data) as StoredTokens;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function saveTokens(
  tokens: StoredTokens,
  path: string = defaultTokenPath(),
): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await fs.writeFile(path, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  try {
    await fs.chmod(path, 0o600);
  } catch {
    // chmod is a noop on Windows, ignore.
  }
}

export async function clearTokens(
  path: string = defaultTokenPath(),
): Promise<boolean> {
  try {
    await fs.unlink(path);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}
