import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

test("compiled stdio server exposes all supported tools", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/index.js")],
    env: {
      ...process.env,
      SHLINK_BASE_URL: "https://s.example.com",
      SHLINK_API_KEY: "test-only-key",
    } as Record<string, string>,
  });
  const client = new Client({ name: "shlink-mcp-test", version: "0.1.0" });

  try {
    await client.connect(transport);
    const response = await client.listTools();
    assert.equal(response.tools.length, 23);
    assert.deepEqual(
      response.tools.map((tool) => tool.name).sort(),
      [
        "create_short_url",
        "delete_orphan_visits",
        "delete_short_url",
        "delete_short_url_visits",
        "delete_tags",
        "edit_short_url",
        "get_domain_visits",
        "get_mercure_info",
        "get_qr_code_url",
        "get_redirect_rules",
        "get_short_url",
        "get_short_url_visits",
        "get_tag_visits",
        "get_visit_stats",
        "list_domains",
        "list_non_orphan_visits",
        "list_orphan_visits",
        "list_short_urls",
        "list_tags",
        "rename_tag",
        "set_domain_redirects",
        "set_redirect_rules",
        "shlink_health",
      ],
    );
  } finally {
    await client.close();
  }
});
