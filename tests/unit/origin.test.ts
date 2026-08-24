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

  it("接受与当前 Host 同源的 Origin（IP 访问）", () => {
    const req = new NextRequest("http://47.109.110.141/api/x", {
      method: "POST",
      headers: { origin: "http://47.109.110.141", host: "47.109.110.141" },
    });
    expect(assertSameOrigin(req)).toBe(true);
  });

  it("接受反代转发后的自身 Origin", () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/x", {
      method: "POST",
      headers: {
        origin: "http://47.109.110.141",
        host: "127.0.0.1:3000",
        "x-forwarded-host": "47.109.110.141",
        "x-forwarded-proto": "http",
      },
    });
    const previous = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = "true";
    try {
      expect(assertSameOrigin(req)).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = previous;
    }
  });

  it("拒绝未受信 Origin", () => {
    const req = new NextRequest("http://localhost:3000/api/x", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(assertSameOrigin(req)).toBe(false);
  });
});
