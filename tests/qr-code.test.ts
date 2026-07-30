import assert from "node:assert/strict";
import test from "node:test";
import { buildQrCodeUrl } from "../src/server.js";

test("builds QR-code options as query parameters", () => {
  const url = buildQrCodeUrl("https://s.example.com", {
    shortCode: "campaign",
    size: 500,
    margin: 20,
    format: "svg",
    errorCorrection: "Q",
    roundBlockSize: false,
    color: "123abc",
    bgColor: "fff",
  });

  assert.equal(
    url,
    "https://s.example.com/campaign/qr-code?size=500&margin=20&format=svg&errorCorrection=Q&roundBlockSize=false&color=123abc&bgColor=fff",
  );
});

test("supports custom domains, base paths, and multi-segment slugs", () => {
  assert.equal(
    buildQrCodeUrl("https://default.example.com/shlink", {
      shortCode: "my/campaign",
      domain: "go.example.com",
    }),
    "https://go.example.com/shlink/my/campaign/qr-code",
  );
});
