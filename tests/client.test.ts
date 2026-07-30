import assert from "node:assert/strict";
import test from "node:test";
import { ShlinkClient, ShlinkError } from "../src/shlink/client.js";

const config = {
  baseUrl: "https://s.example.com",
  apiKey: "secret",
  apiVersion: 3,
  timeoutMs: 1_000,
  allowDestructive: false,
};

test("sends authentication and encodes query parameters", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const mockFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
    requestUrl = input.toString();
    requestInit = init;
    return new Response(JSON.stringify({ shortUrls: { data: [] } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const client = new ShlinkClient(config, mockFetch as typeof fetch);
  await client.api("/short-urls", { query: { page: 2, tags: ["one", "two"] } });

  const url = new URL(requestUrl);
  assert.equal(url.pathname, "/rest/v3/short-urls");
  assert.equal(url.searchParams.get("page"), "2");
  assert.deepEqual(url.searchParams.getAll("tags"), ["one", "two"]);
  assert.equal(new Headers(requestInit?.headers).get("x-api-key"), "secret");
});

test("maps Shlink problem details and request IDs", async () => {
  const mockFetch = async () =>
    new Response(
      JSON.stringify({
        type: "https://shlink.io/api/error/invalid-api-key",
        detail: "Provided API key is invalid.",
      }),
      { status: 401, headers: { "x-request-id": "req-123" } },
    );

  const client = new ShlinkClient(config, mockFetch as typeof fetch);
  await assert.rejects(
    () => client.api("/short-urls"),
    (error: unknown) =>
      error instanceof ShlinkError &&
      error.status === 401 &&
      error.requestId === "req-123" &&
      error.message === "Provided API key is invalid.",
  );
});

test("health endpoint does not send the API key", async () => {
  let headers = new Headers();
  const mockFetch = async (_input: URL | RequestInfo, init?: RequestInit) => {
    headers = new Headers(init?.headers);
    return new Response(JSON.stringify({ status: "pass" }), { status: 200 });
  };

  const client = new ShlinkClient(config, mockFetch as typeof fetch);
  await client.health();
  assert.equal(headers.has("x-api-key"), false);
});
