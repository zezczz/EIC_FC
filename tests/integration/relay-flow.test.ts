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
    await db.article.deleteMany();
    await db.user.deleteMany();

    const passwordHash = await hashPassword("captain-password-1");
    const captain = await db.user.create({
      data: {
        username: "relaycaptain",
        usernameNormalized: "relaycaptain",
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

    const passwordHash = await hashPassword("captain-password-1");
    const declinedMember = await db.user.create({
      data: {
        username: "relaydeclined",
        usernameNormalized: "relaydeclined",
        passwordHash,
        displayName: "拒绝队员",
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
    await putRelayEntry(
      relay.id,
      declinedMember.id,
      {
        response: "DECLINED",
        participantCount: 1,
        companionNames: [],
        note: "有事无法参加",
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
    expect(joinedRows).toContain("准时到");

    const infoSheet = workbook.getWorksheet("活动信息");
    expect(infoSheet).toBeTruthy();
    const infoRows = sheetToText(infoSheet!);
    expect(infoRows).toContain("正式参加人员");
    expect(infoRows).toContain("接龙队员");
    expect(infoRows).toContain("王五");
    expect(infoRows).toContain("无法参加人员");
    expect(infoRows).toContain("拒绝队员");
    expect(infoRows).toContain("无法参加人数");

    const rosterRows = collectRosterRows(infoSheet!);
    expect(rosterRows.header).toEqual(["姓名", "状态", "备注"]);
    expect(rosterRows.entries).toContainEqual(["接龙队员", "join", "准时到"]);
    expect(rosterRows.entries).toContainEqual(["拒绝队员", "declined", "有事无法参加"]);
    expect(infoRows).not.toContain("接龙队员 join 准时到");
    expect(infoRows).not.toContain("拒绝队员 declined 有事无法参加");
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

function cellText(sheet: ExcelJS.Worksheet, row: number, column: number) {
  return String(sheet.getCell(row, column).value ?? "");
}

function collectRosterRows(sheet: ExcelJS.Worksheet) {
  let headerRow = 0;
  sheet.eachRow((row) => {
    if (
      cellText(sheet, row.number, 1) === "姓名" &&
      cellText(sheet, row.number, 2) === "状态" &&
      cellText(sheet, row.number, 3) === "备注"
    ) {
      headerRow = row.number;
    }
  });
  expect(headerRow).toBeGreaterThan(0);

  const entries: string[][] = [];
  sheet.eachRow((row) => {
    if (row.number <= headerRow) return;
    entries.push([
      cellText(sheet, row.number, 1),
      cellText(sheet, row.number, 2),
      cellText(sheet, row.number, 3),
    ]);
  });

  return {
    header: [
      cellText(sheet, headerRow, 1),
      cellText(sheet, headerRow, 2),
      cellText(sheet, headerRow, 3),
    ],
    entries,
  };
}
