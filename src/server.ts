import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "./config.js";
import { ShlinkClient, ShlinkError, type QueryValue } from "./shlink/client.js";

const shortCodeIdentity = {
  shortCode: z.string().min(1).describe("The Shlink short code"),
  domain: z.string().min(1).optional().describe("Domain when the short code is not on the default domain"),
};

const isoDate = z.string().datetime({ offset: true });
const pagination = {
  page: z.number().int().positive().optional(),
  itemsPerPage: z.number().int().min(1).max(100).optional(),
};

const shortUrlBody = {
  longUrl: z.string().url().optional(),
  customSlug: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  domain: z.string().optional(),
  validSince: isoDate.nullable().optional(),
  validUntil: isoDate.nullable().optional(),
  maxVisits: z.number().int().positive().nullable().optional(),
  crawlable: z.boolean().optional(),
  forwardQuery: z.boolean().optional(),
};

const visitFilters = {
  ...pagination,
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  excludeBots: z.boolean().optional(),
};

type QrCodeOptions = {
  shortCode: string;
  domain?: string;
  size?: number;
  margin?: number;
  format?: "png" | "svg";
  errorCorrection?: "L" | "M" | "Q" | "H";
  roundBlockSize?: boolean;
  color?: string;
  bgColor?: string;
};

export function buildQrCodeUrl(baseUrl: string, options: QrCodeOptions): string {
  const url = new URL(baseUrl);
  if (options.domain) url.hostname = options.domain;

  const basePath = url.pathname.replace(/\/+$/, "");
  const encodedShortCode = options.shortCode
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  url.pathname = `${basePath}/${encodedShortCode}/qr-code`;
  url.search = "";

  for (const [key, value] of Object.entries({
    size: options.size,
    margin: options.margin,
    format: options.format,
    errorCorrection: options.errorCorrection,
    roundBlockSize: options.roundBlockSize,
    color: options.color,
    bgColor: options.bgColor,
  })) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(error: unknown) {
  if (error instanceof ShlinkError) {
    return {
      isError: true,
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          error: error.message,
          status: error.status,
          requestId: error.requestId,
          type: error.problemType,
        }),
      }],
    };
  }
  return {
    isError: true,
    content: [{ type: "text" as const, text: error instanceof Error ? error.message : String(error) }],
  };
}

function queryOf(values: Record<string, unknown>): Record<string, QueryValue> {
  return values as Record<string, QueryValue>;
}

export function createServer(config: Config, client = new ShlinkClient(config)): McpServer {
  const server = new McpServer(
    { name: "shlink-mcp", version: "0.1.0" },
    {
      instructions:
        "Use read-only tools freely. Create and edit tools change Shlink. Deletion requires explicit confirmation and server-side opt-in.",
    },
  );

  const register = (
    name: string,
    // The SDK's registerTool overload is generic over each individual schema.
    // This small wrapper centralizes result/error formatting, so preserve the
    // SDK's runtime validation while allowing each call to infer independently.
    definition: any,
    handler: (args: any) => Promise<unknown> | unknown,
  ) => {
    server.registerTool(name, definition, async (args) => {
      try {
        return result(await handler(args));
      } catch (error) {
        return errorResult(error);
      }
    });
  };

  register(
    "shlink_health",
    {
      description: "Check whether the configured Shlink instance is healthy.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    () => client.health(),
  );

  register(
    "list_short_urls",
    {
      description: "List and search short URLs, with bounded pagination.",
      inputSchema: {
        ...pagination,
        searchTerm: z.string().optional(),
        tags: z.array(z.string()).optional(),
        orderBy: z.string().optional(),
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    (args) => client.api("/short-urls", { query: queryOf(args) }),
  );

  register(
    "get_short_url",
    {
      description: "Get details for one Shlink short code.",
      inputSchema: shortCodeIdentity,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ shortCode, domain }) =>
      client.api(`/short-urls/${encodeURIComponent(shortCode)}`, { query: { domain } }),
  );

  register(
    "create_short_url",
    {
      description: "Create a new Shlink short URL.",
      inputSchema: {
        ...shortUrlBody,
        longUrl: z.string().url(),
        findIfExists: z.boolean().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    (args) => client.api("/short-urls", { method: "POST", body: args }),
  );

  register(
    "edit_short_url",
    {
      description: "Edit an existing Shlink short URL.",
      inputSchema: { ...shortCodeIdentity, ...shortUrlBody },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ shortCode, domain, ...body }) =>
      client.api(`/short-urls/${encodeURIComponent(shortCode)}`, {
        method: "PATCH",
        query: { domain },
        body,
      }),
  );

  register(
    "delete_short_url",
    {
      description:
        "Permanently delete a short URL. Requires SHLINK_ALLOW_DESTRUCTIVE=true and confirm=true.",
      inputSchema: { ...shortCodeIdentity, confirm: z.literal(true) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ shortCode, domain }) => {
      if (!config.allowDestructive) {
        throw new Error("Deletion is disabled. Set SHLINK_ALLOW_DESTRUCTIVE=true to enable it.");
      }
      await client.api(`/short-urls/${encodeURIComponent(shortCode)}`, {
        method: "DELETE",
        query: { domain },
      });
      return { deleted: true, shortCode, domain: domain ?? null };
    },
  );

  register(
    "get_short_url_visits",
    {
      description: "List visits for one short URL.",
      inputSchema: {
        ...shortCodeIdentity,
        ...pagination,
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        excludeBots: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ shortCode, ...query }) =>
      client.api(`/short-urls/${encodeURIComponent(shortCode)}/visits`, {
        query: queryOf(query),
      }),
  );

  register(
    "list_tags",
    {
      description: "List Shlink tags, optionally including usage and visit statistics.",
      inputSchema: { withStats: z.boolean().optional() },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ withStats }) => client.api(withStats ? "/tags/stats" : "/tags"),
  );

  register(
    "list_domains",
    {
      description: "List domains configured or used by Shlink.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    () => client.api("/domains"),
  );

  register(
    "get_visit_stats",
    {
      description: "Get general visit statistics from Shlink.",
      inputSchema: {
        startDate: isoDate.optional(),
        endDate: isoDate.optional(),
        groupBy: z.enum(["date", "country", "city", "browser", "os", "referer"]).optional(),
        excludeBots: z.boolean().optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    (args) => client.api("/visits", { query: queryOf(args) }),
  );

  register(
    "get_redirect_rules",
    {
      description: "List dynamic redirect rules configured for a short URL.",
      inputSchema: shortCodeIdentity,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ shortCode, domain }) =>
      client.api(`/short-urls/${encodeURIComponent(shortCode)}/redirect-rules`, {
        query: { domain },
      }),
  );

  register(
    "set_redirect_rules",
    {
      description:
        "Replace the dynamic redirect rules for a short URL. Rules are evaluated by Shlink in their provided order.",
      inputSchema: {
        ...shortCodeIdentity,
        redirectRules: z.array(z.record(z.unknown())).describe("Shlink redirect-rule objects"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ shortCode, domain, redirectRules }) =>
      client.api(`/short-urls/${encodeURIComponent(shortCode)}/redirect-rules`, {
        method: "POST",
        query: { domain },
        body: { redirectRules },
      }),
  );

  register(
    "get_tag_visits",
    {
      description: "List visits associated with short URLs carrying a specific tag.",
      inputSchema: { tag: z.string().min(1), ...visitFilters },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ tag, ...query }) =>
      client.api(`/tags/${encodeURIComponent(tag)}/visits`, { query: queryOf(query) }),
  );

  register(
    "get_domain_visits",
    {
      description: "List visits for short URLs under a specific domain.",
      inputSchema: { domain: z.string().min(1), ...visitFilters },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    ({ domain, ...query }) =>
      client.api(`/domains/${encodeURIComponent(domain)}/visits`, { query: queryOf(query) }),
  );

  register(
    "list_orphan_visits",
    {
      description: "List visits that did not resolve to a valid short URL.",
      inputSchema: visitFilters,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    (args) => client.api("/visits/orphan", { query: queryOf(args) }),
  );

  register(
    "list_non_orphan_visits",
    {
      description: "List visits that belong to valid short URLs.",
      inputSchema: visitFilters,
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    (args) => client.api("/visits/non-orphan", { query: queryOf(args) }),
  );

  register(
    "rename_tag",
    {
      description: "Rename a tag everywhere it is used.",
      inputSchema: {
        oldName: z.string().min(1),
        newName: z.string().min(1),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    (body) => client.api("/tags", { method: "PUT", body }),
  );

  register(
    "delete_tags",
    {
      description:
        "Delete one or more tags. Requires SHLINK_ALLOW_DESTRUCTIVE=true and confirm=true.",
      inputSchema: {
        tags: z.array(z.string().min(1)).min(1),
        confirm: z.literal(true),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ tags }) => {
      if (!config.allowDestructive) {
        throw new Error("Tag deletion is disabled. Set SHLINK_ALLOW_DESTRUCTIVE=true to enable it.");
      }
      await client.api("/tags", { method: "DELETE", query: { tags } });
      return { deleted: true, tags };
    },
  );

  register(
    "set_domain_redirects",
    {
      description:
        "Configure optional fallback redirects for the base URL, invalid short URLs, and regular 404 paths.",
      inputSchema: {
        baseUrlRedirect: z.string().url().nullable().optional(),
        invalidShortUrlRedirect: z.string().url().nullable().optional(),
        regular404Redirect: z.string().url().nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    (body) => client.api("/domains/redirects", { method: "PATCH", body }),
  );

  register(
    "delete_short_url_visits",
    {
      description:
        "Permanently erase visit history for one short URL. Requires SHLINK_ALLOW_DESTRUCTIVE=true and confirm=true.",
      inputSchema: { ...shortCodeIdentity, confirm: z.literal(true) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ shortCode, domain }) => {
      if (!config.allowDestructive) {
        throw new Error("Visit deletion is disabled. Set SHLINK_ALLOW_DESTRUCTIVE=true to enable it.");
      }
      const response = await client.api(`/short-urls/${encodeURIComponent(shortCode)}/visits`, {
        method: "DELETE",
        query: { domain },
      });
      return { deleted: true, shortCode, domain: domain ?? null, response };
    },
  );

  register(
    "delete_orphan_visits",
    {
      description:
        "Permanently erase all orphan visits. Requires SHLINK_ALLOW_DESTRUCTIVE=true and confirm=true.",
      inputSchema: { confirm: z.literal(true) },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async () => {
      if (!config.allowDestructive) {
        throw new Error("Visit deletion is disabled. Set SHLINK_ALLOW_DESTRUCTIVE=true to enable it.");
      }
      const response = await client.api("/visits/orphan", { method: "DELETE" });
      return { deleted: true, response };
    },
  );

  register(
    "get_mercure_info",
    {
      description: "Get Shlink's Mercure real-time integration information when configured.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    () => client.api("/mercure-info"),
  );

  register(
    "get_qr_code_url",
    {
      description:
        "Build the public Shlink QR-code image URL for a short code. This returns a URL rather than downloading binary image data.",
      inputSchema: {
        ...shortCodeIdentity,
        size: z.number().int().min(50).max(1000).optional(),
        margin: z.number().int().nonnegative().optional(),
        format: z.enum(["png", "svg"]).optional(),
        errorCorrection: z.enum(["L", "M", "Q", "H"]).optional(),
        roundBlockSize: z.boolean().optional(),
        color: z.string().regex(/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/).optional(),
        bgColor: z.string().regex(/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/).optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    (args) => ({ qrCodeUrl: buildQrCodeUrl(config.baseUrl, args) }),
  );

  return server;
}
