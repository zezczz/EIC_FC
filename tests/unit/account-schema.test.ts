import { describe, expect, it } from "vitest";
import { profileUpdateSchema, passwordChangeSchema } from "@/schemas/account";

describe("account schema", () => {
  it("accepts extra profile fields", () => {
    const parsed = profileUpdateSchema.parse({
      signature: "永不独行",
      studentId: "U202012345",
      fieldPositions: ["ST", "CF"],
      preferredFoot: "RIGHT",
    });
    expect(parsed.fieldPositions).toEqual(["ST", "CF"]);
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
