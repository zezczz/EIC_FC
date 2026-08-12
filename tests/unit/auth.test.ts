import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema, passwordSchema } from "@/schemas/auth";
import { redact } from "@/server/audit";

describe("auth schemas", () => {
  it("接受合法注册输入", () => {
    const parsed = registerSchema.parse({
      username: "player01",
      email: "Player@Example.com",
      displayName: "球员一号",
      password: "long-password",
      confirmPassword: "long-password",
      applicationMessage: "想踢中场",
    });
    expect(parsed.email).toBe("player@example.com");
  });

  it("拒绝过短密码", () => {
    expect(() => passwordSchema.parse("short")).toThrow();
  });

  it("登录身份必填", () => {
    expect(() => loginSchema.parse({ identity: "", password: "x" })).toThrow();
  });
});

describe("audit redact", () => {
  it("脱敏密码与邮箱", () => {
    const out = redact({
      password: "secret",
      email: "a@b.com",
      username: "ok",
    }) as Record<string, unknown>;
    expect(out.password).toBe("[REDACTED]");
    expect(out.email).toBe("[REDACTED]");
    expect(out.username).toBe("ok");
  });
});
