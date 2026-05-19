import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "../pinterest.js";
import { run } from "./shared.js";

const privacySchema = z.enum(["PUBLIC", "PROTECTED", "SECRET"]);

export function registerBoardTools(server: McpServer, client: PinterestClient) {
  server.tool(
    "create_board",
    "Create a new Pinterest board.",
    {
      name: z.string().max(180),
      description: z.string().max(500).optional(),
      privacy: privacySchema.optional().describe("Defaults to PUBLIC."),
    },
    async (args) => run(() => client.post("/v5/boards", args)),
  );

  server.tool(
    "get_board",
    "Fetch a single board by ID.",
    { board_id: z.string() },
    async ({ board_id }) =>
      run(() => client.get(`/v5/boards/${encodeURIComponent(board_id)}`)),
  );

  server.tool(
    "list_boards",
    "List the authenticated user's boards. Supports pagination via bookmark.",
    {
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(250).optional(),
      privacy: privacySchema.optional(),
      ad_account_id: z.string().optional(),
    },
    async (args) => run(() => client.get("/v5/boards", args)),
  );

  server.tool(
    "update_board",
    "Update a board's name, description, or privacy.",
    {
      board_id: z.string(),
      name: z.string().max(180).optional(),
      description: z.string().max(500).optional(),
      privacy: privacySchema.optional(),
    },
    async ({ board_id, ...body }) =>
      run(() => client.patch(`/v5/boards/${encodeURIComponent(board_id)}`, body)),
  );

  server.tool(
    "delete_board",
    "Permanently delete a board and all of its pins. This action cannot be undone.",
    { board_id: z.string() },
    async ({ board_id }) =>
      run(async () => {
        await client.delete(`/v5/boards/${encodeURIComponent(board_id)}`);
        return { deleted: board_id };
      }),
  );

  server.tool(
    "list_board_pins",
    "List the pins on a specific board.",
    {
      board_id: z.string(),
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(100).optional(),
      pin_metrics: z.boolean().optional(),
      creative_types: z
        .array(
          z.enum([
            "REGULAR",
            "VIDEO",
            "SHOPPING",
            "CAROUSEL",
            "MAX_VIDEO",
            "SHOP_THE_PIN",
            "COLLECTION",
            "IDEA",
          ]),
        )
        .optional(),
    },
    async ({ board_id, ...query }) =>
      run(() =>
        client.get(`/v5/boards/${encodeURIComponent(board_id)}/pins`, query),
      ),
  );

  server.tool(
    "create_board_section",
    "Create a section inside a board.",
    {
      board_id: z.string(),
      name: z.string().max(180),
    },
    async ({ board_id, ...body }) =>
      run(() =>
        client.post(`/v5/boards/${encodeURIComponent(board_id)}/sections`, body),
      ),
  );

  server.tool(
    "list_board_sections",
    "List the sections of a board.",
    {
      board_id: z.string(),
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(100).optional(),
    },
    async ({ board_id, ...query }) =>
      run(() =>
        client.get(`/v5/boards/${encodeURIComponent(board_id)}/sections`, query),
      ),
  );

  server.tool(
    "update_board_section",
    "Rename a board section.",
    {
      board_id: z.string(),
      section_id: z.string(),
      name: z.string().max(180),
    },
    async ({ board_id, section_id, ...body }) =>
      run(() =>
        client.patch(
          `/v5/boards/${encodeURIComponent(board_id)}/sections/${encodeURIComponent(section_id)}`,
          body,
        ),
      ),
  );

  server.tool(
    "delete_board_section",
    "Delete a section from a board.",
    {
      board_id: z.string(),
      section_id: z.string(),
    },
    async ({ board_id, section_id }) =>
      run(async () => {
        await client.delete(
          `/v5/boards/${encodeURIComponent(board_id)}/sections/${encodeURIComponent(section_id)}`,
        );
        return { deleted: section_id };
      }),
  );

  server.tool(
    "list_board_section_pins",
    "List the pins inside a board section.",
    {
      board_id: z.string(),
      section_id: z.string(),
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(100).optional(),
    },
    async ({ board_id, section_id, ...query }) =>
      run(() =>
        client.get(
          `/v5/boards/${encodeURIComponent(board_id)}/sections/${encodeURIComponent(section_id)}/pins`,
          query,
        ),
      ),
  );
}
