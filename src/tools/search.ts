import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "../pinterest.js";
import { run } from "./shared.js";

export function registerSearchTools(server: McpServer, client: PinterestClient) {
  server.tool(
    "search_user_pins",
    "Search the authenticated user's own pins by a free-text query.",
    {
      query: z.string().min(1),
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(100).optional(),
      ad_account_id: z.string().optional(),
    },
    async (args) => run(() => client.get("/v5/search/user/pins", args)),
  );

  server.tool(
    "search_user_boards",
    "Search the authenticated user's own boards by a free-text query.",
    {
      query: z.string().min(1),
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(100).optional(),
      ad_account_id: z.string().optional(),
    },
    async (args) => run(() => client.get("/v5/search/user/boards", args)),
  );
}
