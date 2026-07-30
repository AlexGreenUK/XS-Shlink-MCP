#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZodError } from "zod";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await server.connect(transport);
}

main().catch((error) => {
  if (error instanceof ZodError) {
    console.error("Invalid configuration:", error.issues.map((issue) => issue.message).join("; "));
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
});
