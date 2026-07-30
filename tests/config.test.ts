import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/config.js";

test("loads and normalizes configuration", () => {
  const config = loadConfig({
    SHLINK_BASE_URL: "https://s.example.com///",
    SHLINK_API_KEY: "secret",
    SHLINK_ALLOW_DESTRUCTIVE: "true",
  });

  assert.equal(config.baseUrl, "https://s.example.com");
  assert.equal(config.apiVersion, 3);
  assert.equal(config.timeoutMs, 10_000);
  assert.equal(config.allowDestructive, true);
});

test("requires a Shlink URL and API key", () => {
  assert.throws(() => loadConfig({}), /Required/);
});
