import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "@/server/http";
import { NextRequest } from "next/server";

describe("assertSameOrigin", () => {
  it("接受受信 Origin", () => {
    const req = new NextRequest("http://localhost:3000/api/x", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    expect(assertSameOrigin(req)).toBe(true);
  });

  it("拒绝未受信 Origin", () => {
    const req = new NextRequest("http://localhost:3000/api/x", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(assertSameOrigin(req)).toBe(false);
  });
});
