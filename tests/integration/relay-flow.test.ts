import { describe, expect, it, beforeAll } from "vitest";
import ExcelJS from "exceljs";
import { hashPassword } from "@/server/auth/password";
import { db } from "@/server/db";
import {
  cancelRelay,
  closeRelay,
  createRelay,
  deleteRelay,
  openRelay,
  putRelayEntry,
  reopenRelay,
  restoreRelay,
  uncancelRelay,
} from "@/server/relays/service";
import { buildRelayExportWorkbook } from "@/server/relays/export";

const ctx = {
  actorId: "",
  requestId: "relay-test",
};

describe("relay lifecycle", () => {
  beforeAll(async () => {
    await db.relayEntry.deleteMany();
    await db.relay.deleteMany();
    await db.user.deleteMany();

    const passwordHash = await hashPassword("captain-password-1");
    const captain = await db.user.create({
      data: {
        username: "relaycaptain",
        usernameNormalized: "relaycaptain",
        email: "relaycaptain@example.com",
        emailNormalized: "relaycaptain@example.com",
        passwordHash,
        displayName: "接龙队长",
        role: "CAPTAIN",
        status: "ACTIVE",
      },
    });
    const member = await db.user.create({
      data: {
        username: "relaymember",
        usernameNormalized: "relaymember",
        email: "relaymember@example.com",
        emailNormalized: "relaymember@example.com",
        passwordHash,
        displayName: "接龙队员",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    ctx.actorId = captain.id;
    (globalThis as { relayMemberId?: string }).relayMemberId = member.id;
  });

  it("supports close and reopen", async () => {
    const now = Date.now();
    const relay = await createRelay(
      {
        title: "重开测试",
        description: "测试",
        location: "球场",
        eventAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
        signupDeadline: new Date(now + 7 * 24 * 60 * 60 * 1000),
        waitlistEnabled: true,
      },
      ctx,
    );
    await openRelay(relay.id, ctx);
    await closeRelay(relay.id, ctx);
    const reopened = await reopenRelay(relay.id, ctx);
    expect(reopened.status).toBe("OPEN");
  });

  it("soft deletes and restores relay", async () => {
    const now = Date.now();
    const relay = await createRelay(
      {
        title: "删除测试",
        description: "测试",
        location: "球场",
        eventAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
        signupDeadline: new Date(now + 7 * 24 * 60 * 60 * 1000),
        waitlistEnabled: true,
      },
      ctx,
    );
    await deleteRelay(relay.id, ctx);
    await expect(getCaptainRelayVisible(relay.id)).resolves.toBeNull();
    await restoreRelay(relay.id, ctx);
    await expect(getCaptainRelayVisible(relay.id)).resolves.not.toBeNull();
  });

  it("restores cancelled relay to closed", async () => {
    const now = Date.now();
    const relay = await createRelay(
      {
        title: "取消恢复测试",
        description: "测试",
        location: "球场",
        eventAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
        signupDeadline: new Date(now + 7 * 24 * 60 * 60 * 1000),
        waitlistEnabled: true,
      },
      ctx,
    );
    await openRelay(relay.id, ctx);
    await cancelRelay(relay.id, ctx);
    const restored = await uncancelRelay(relay.id, ctx);
    expect(restored.status).toBe("CLOSED");
  });

  it("exports participant names in workbook", async () => {
    const now = Date.now();
    const relay = await createRelay(
      {
        title: "导出测试",
        description: "测试",
        location: "球场",
        eventAt: new Date(now + 8 * 24 * 60 * 60 * 1000),
        signupDeadline: new Date(now + 7 * 24 * 60 * 60 * 1000),
        waitlistEnabled: true,
      },
      ctx,
    );
    await openRelay(relay.id, ctx);
    const memberId = (globalThis as { relayMemberId?: string }).relayMemberId!;
    await putRelayEntry(
      relay.id,
      memberId,
      {
        response: "JOINED",
        participantCount: 2,
        companionNames: ["王五"],
        note: "准时到",
      },
      ctx,
    );

    const { buffer, filename } = await buildRelayExportWorkbook(relay.id);
    expect(buffer.byteLength).toBeGreaterThan(1000);
    expect(filename.endsWith(".xlsx")).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const joinedSheet = workbook.getWorksheet("正式参加名单");
    expect(joinedSheet).toBeTruthy();
    const joinedRows = sheetToText(joinedSheet!);
    expect(joinedRows).toContain("接龙队员");
    expect(joinedRows).toContain("王五");
    expect(joinedRows).toContain("同行人员");
  });
});

async function getCaptainRelayVisible(id: string) {
  return db.relay.findFirst({ where: { id, deletedAt: null } });
}

function sheetToText(sheet: ExcelJS.Worksheet) {
  const parts: string[] = [];
  sheet.eachRow((row) => {
    row.eachCell((cell) => parts.push(String(cell.value ?? "")));
  });
  return parts.join("\n");
}
