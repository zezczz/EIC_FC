import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import { getTeamProfile, updateTeamProfile } from "@/server/team/service";

describe("team profile", () => {
  let captainId = "";
  let memberId = "";

  beforeAll(async () => {
    await db.teamImage.deleteMany();
    await db.article.deleteMany();
    await db.relayEntry.deleteMany();
    await db.relay.deleteMany();
    await db.teamProfile.deleteMany();
    await db.user.deleteMany();
    const passwordHash = await hashPassword("team-password-1");
    const captain = await db.user.create({
      data: {
        username: "teamcaptain",
        usernameNormalized: "teamcaptain",
        email: "teamcaptain@example.com",
        emailNormalized: "teamcaptain@example.com",
        passwordHash,
        displayName: "球队队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });
    const member = await db.user.create({
      data: {
        username: "teammember",
        usernameNormalized: "teammember",
        email: "teammember@example.com",
        emailNormalized: "teammember@example.com",
        passwordHash,
        displayName: "球队队员",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    captainId = captain.id;
    memberId = member.id;
    await db.teamProfile.create({
      data: {
        id: "default",
        name: "EIC FC",
        subtitle: "华科电信足球队",
        honors: "",
        summary: "旧简介",
        contentJson: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "旧简介" }] }],
        },
        plainText: "旧简介",
      },
    });
  });

  it("captain can update team profile", async () => {
    const updated = await updateTeamProfile(
      {
        name: "EIC FC",
        subtitle: "华科电信足球队",
        contact: "captain@example.com",
        honors: "院联赛冠军",
        summary: "新简介",
        contentJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "新简介",
                  marks: [{ type: "textColor", attrs: { color: "green" } }],
                },
              ],
            },
          ],
        },
        images: [],
        version: 1,
      },
      { actorId: captainId, requestId: "team-update" },
    );
    expect(updated.contact).toBe("captain@example.com");
    expect(updated.honors).toContain("院联赛冠军");
    expect(updated.version).toBe(2);
  });

  it("rejects stale versions", async () => {
    await expect(
      updateTeamProfile(
        {
          name: "EIC FC",
          honors: "",
          summary: "冲突",
          contentJson: { type: "doc", content: [{ type: "paragraph" }] },
          images: [],
          version: 1,
        },
        { actorId: captainId, requestId: "team-conflict" },
      ),
    ).rejects.toThrow();
  });

  it("public read returns the saved profile", async () => {
    const profile = await getTeamProfile();
    expect(profile.name).toBe("EIC FC");
    expect(profile.summary).toBe("新简介");
    expect(memberId).toBeTruthy();
  });
});
