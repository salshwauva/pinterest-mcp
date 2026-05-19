import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PinterestClient } from "../pinterest.js";
import { run } from "./shared.js";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
  .describe("Date in YYYY-MM-DD format. Range is inclusive.");

const metricTypes = z
  .array(
    z.enum([
      "IMPRESSION",
      "SAVE",
      "PIN_CLICK",
      "OUTBOUND_CLICK",
      "VIDEO_MRC_VIEW",
      "VIDEO_AVG_WATCH_TIME",
      "VIDEO_V50_WATCH_TIME",
      "QUARTILE_95_PERCENT_VIEW",
      "VIDEO_10S_VIEW",
      "VIDEO_START",
      "ENGAGEMENT",
      "CLOSEUP",
    ]),
  )
  .optional()
  .describe("Subset of analytics metrics to return. Omit to get all available.");

const appTypes = z
  .enum(["ALL", "MOBILE", "TABLET", "WEB"])
  .optional()
  .describe("Filter by app surface. Defaults to ALL.");

export function registerAnalyticsTools(
  server: McpServer,
  client: PinterestClient,
) {
  server.tool(
    "get_pin_analytics",
    "Fetch analytics for a single pin over a date range. Max 90 day window. start_date must be within the last 90 days.",
    {
      pin_id: z.string(),
      start_date: dateSchema,
      end_date: dateSchema,
      metric_types: metricTypes,
      app_types: appTypes,
      split_field: z.enum(["NO_SPLIT", "APP_TYPE"]).optional(),
      ad_account_id: z.string().optional(),
    },
    async ({ pin_id, ...query }) =>
      run(() =>
        client.get(
          `/v5/pins/${encodeURIComponent(pin_id)}/analytics`,
          query,
        ),
      ),
  );

  server.tool(
    "get_user_analytics",
    "Fetch account-wide analytics for the authenticated user over a date range. Max 90 day window.",
    {
      start_date: dateSchema,
      end_date: dateSchema,
      from_claimed_content: z
        .enum(["CLAIMED", "OTHER", "BOTH"])
        .optional()
        .describe("Filter by whether the pin came from claimed content."),
      pin_format: z
        .enum([
          "ALL",
          "PRODUCT",
          "REGULAR",
          "VIDEO",
          "IDEA",
          "PROMOTED",
          "PROMOTED_VIDEO",
          "PROMOTED_QUIZ",
          "PROMOTED_CAROUSEL",
          "PROMOTED_PRODUCT",
          "PROMOTED_IDEA",
          "PROMOTED_MAX_VIDEO",
          "PROMOTED_SHOPPING",
          "PROMOTED_COLLECTION",
          "STORY",
          "TEXT_STORY",
        ])
        .optional(),
      app_types: appTypes,
      metric_types: metricTypes,
      split_field: z
        .enum([
          "NO_SPLIT",
          "APP_TYPE",
          "OWNED_CONTENT",
          "PIN_FORMAT",
          "CONTENT_TYPE",
          "SOURCE",
        ])
        .optional(),
      ad_account_id: z.string().optional(),
    },
    async (args) => run(() => client.get("/v5/user_account/analytics", args)),
  );

  server.tool(
    "get_user_account",
    "Fetch the authenticated user's account profile.",
    { ad_account_id: z.string().optional() },
    async (args) => run(() => client.get("/v5/user_account", args)),
  );
}
