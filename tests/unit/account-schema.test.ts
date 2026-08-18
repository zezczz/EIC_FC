import { describe, expect, it } from "vitest";
import { profileUpdateSchema, passwordChangeSchema } from "@/schemas/account";

describe("account schema", () => {
  it("accepts profile update", () => {
    const parsed = profileUpdateSchema.parse({ displayName: "新昵称" });
    expect(parsed.displayName).toBe("新昵称");
  });

  it("rejects mismatched passwords", () => {
    expect(() =>
      passwordChangeSchema.parse({
        currentPassword: "old-password-1",
        newPassword: "new-password-12",
        confirmPassword: "different-password",
      }),
    ).toThrow();
  });
});
