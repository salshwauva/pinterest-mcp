#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { clientFromEnv } from "./pinterest.js";
import { registerPinTools } from "./tools/pins.js";
import { registerBoardTools } from "./tools/boards.js";
import { registerSearchTools } from "./tools/search.js";
import { registerAnalyticsTools } from "./tools/analytics.js";

async function main() {
  const client = clientFromEnv();

  const server = new McpServer({
    name: "claude-pinterest",
    version: "0.1.0",
  });

  registerPinTools(server, client);
  registerBoardTools(server, client);
  registerSearchTools(server, client);
  registerAnalyticsTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("claude-pinterest MCP server connected on stdio\n");
}

main().catch((err) => {
  process.stderr.write(
    `claude-pinterest fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
