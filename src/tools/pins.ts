import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "../pinterest.js";
import { run } from "./shared.js";

const mediaSourceSchema = z
  .object({
    source_type: z.enum([
      "image_url",
      "image_base64",
      "video_id",
      "multiple_image_urls",
      "multiple_image_base64",
      "pin_url",
    ]),
    url: z.string().url().optional(),
    content_type: z.string().optional(),
    data: z.string().optional(),
    cover_image_url: z.string().url().optional(),
    cover_image_content_type: z.string().optional(),
    cover_image_data: z.string().optional(),
    media_id: z.string().optional(),
    items: z.array(z.record(z.unknown())).optional(),
    is_standard: z.boolean().optional(),
    index: z.number().int().optional(),
  })
  .describe(
    "Media source for the pin. For a simple image use { source_type: 'image_url', url }.",
  );

export function registerPinTools(server: McpServer, client: PinterestClient) {
  server.tool(
    "create_pin",
    "Create a new Pinterest pin on a board. Provide at minimum a board_id and a media_source. For images, pass { source_type: 'image_url', url }.",
    {
      board_id: z.string().describe("Destination board ID."),
      board_section_id: z.string().optional(),
      title: z.string().max(100).optional(),
      description: z.string().max(800).optional(),
      link: z.string().url().optional(),
      alt_text: z.string().max(500).optional(),
      dominant_color: z
        .string()
        .regex(/^#?[0-9A-Fa-f]{6}$/)
        .optional()
        .describe("Hex color, e.g. '#6E7874'."),
      media_source: mediaSourceSchema,
      parent_pin_id: z.string().optional().describe("Set when creating a repin."),
    },
    async (args) => run(() => client.post("/v5/pins", args)),
  );

  server.tool(
    "get_pin",
    "Fetch a single pin by its ID. Optionally include pin metrics in the response.",
    {
      pin_id: z.string(),
      pin_metrics: z.boolean().optional(),
      ad_account_id: z.string().optional(),
    },
    async ({ pin_id, ...query }) =>
      run(() => client.get(`/v5/pins/${encodeURIComponent(pin_id)}`, query)),
  );

  server.tool(
    "list_pins",
    "List the authenticated user's pins. Supports pagination via bookmark.",
    {
      bookmark: z.string().optional(),
      page_size: z.number().int().min(1).max(100).optional(),
      pin_filter: z
        .enum([
          "exclude_native",
          "exclude_repins",
          "has_been_promoted",
          "video_pins",
        ])
        .optional(),
      include_protected_pins: z.boolean().optional(),
      pin_metrics: z.boolean().optional(),
      ad_account_id: z.string().optional(),
    },
    async (args) => run(() => client.get("/v5/pins", args)),
  );

  server.tool(
    "update_pin",
    "Update mutable fields on an existing pin: title, description, link, board, section, alt_text.",
    {
      pin_id: z.string(),
      title: z.string().max(100).optional(),
      description: z.string().max(800).optional(),
      link: z.string().url().optional(),
      alt_text: z.string().max(500).optional(),
      board_id: z.string().optional(),
      board_section_id: z.string().optional(),
    },
    async ({ pin_id, ...body }) =>
      run(() => client.patch(`/v5/pins/${encodeURIComponent(pin_id)}`, body)),
  );

  server.tool(
    "delete_pin",
    "Permanently delete a pin. This action cannot be undone.",
    { pin_id: z.string() },
    async ({ pin_id }) =>
      run(async () => {
        await client.delete(`/v5/pins/${encodeURIComponent(pin_id)}`);
        return { deleted: pin_id };
      }),
  );
}
