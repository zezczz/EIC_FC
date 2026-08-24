import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { errNotFound } from "@/server/errors";
import { formatDateTime } from "@/lib/format";
import { RELAY_RESPONSE_LABELS, RELAY_STATUS_LABELS } from "@/lib/relay-labels";

type EntryWithUser = {
  id: string;
  response: "JOINED" | "WAITLISTED" | "DECLINED";
  participantCount: number;
  companionNames: string[];
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { username: string; displayName: string };
};

type ParticipantRow = {
  index: number;
  participantName: string;
  participantType: "报名成员" | "同行人员" | "历史数据未记录姓名";
  registrantDisplayName: string;
  registrantUsername: string;
  note: string;
  registeredAt: string;
};

function expandParticipantRows(
  entries: EntryWithUser[],
  response: "JOINED" | "WAITLISTED",
): ParticipantRow[] {
  const rows: ParticipantRow[] = [];
  let index = 1;

  for (const entry of entries.filter((item) => item.response === response)) {
    const base = {
      registrantDisplayName: entry.user.displayName,
      registrantUsername: entry.user.username,
      note: entry.note ?? "",
      registeredAt: formatDateTime(entry.createdAt),
    };

    rows.push({
      index: index++,
      participantName: entry.user.displayName,
      participantType: "报名成员",
      ...base,
    });

    if (entry.companionNames.length > 0) {
      for (const name of entry.companionNames) {
        rows.push({
          index: index++,
          participantName: name,
          participantType: "同行人员",
          ...base,
        });
      }
      continue;
    }

    if (entry.participantCount > 1) {
      for (let i = 0; i < entry.participantCount - 1; i += 1) {
        rows.push({
          index: index++,
          participantName: "历史数据未记录姓名",
          participantType: "历史数据未记录姓名",
          ...base,
        });
      }
    }
  }

  return rows;
}

function formatParticipantNames(
  entries: EntryWithUser[],
  response: "JOINED" | "WAITLISTED",
): string {
  const names = expandParticipantRows(entries, response).map((row) => row.participantName);
  return names.length > 0 ? names.join("、") : "无";
}

function formatDeclinedNames(entries: EntryWithUser[]): string {
  const names = entries
    .filter((entry) => entry.response === "DECLINED")
    .map((entry) => entry.user.displayName);
  return names.length > 0 ? names.join("、") : "无";
}

export async function buildRelayExportWorkbook(relayId: string) {
  const relay = await db.relay.findFirst({
    where: { id: relayId, deletedAt: null },
    include: {
      entries: {
        orderBy: [{ response: "asc" }, { createdAt: "asc" }],
        include: {
          user: { select: { username: true, displayName: true } },
        },
      },
    },
  });
  if (!relay) throw errNotFound("接龙不存在");

  const joinedCount = relay.entries
    .filter((entry) => entry.response === "JOINED")
    .reduce((sum, entry) => sum + entry.participantCount, 0);
  const waitlistCount = relay.entries
    .filter((entry) => entry.response === "WAITLISTED")
    .reduce((sum, entry) => sum + entry.participantCount, 0);
  const declinedCount = relay.entries
    .filter((entry) => entry.response === "DECLINED")
    .reduce((sum, entry) => sum + entry.participantCount, 0);
  const joinedParticipantNames = formatParticipantNames(relay.entries, "JOINED");
  const declinedParticipantNames = formatDeclinedNames(relay.entries);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "EIC FC";
  workbook.created = new Date();

  const infoSheet = workbook.addWorksheet("活动信息");
  infoSheet.columns = [
    { header: "字段", key: "field", width: 18 },
    { header: "内容", key: "value", width: 48 },
  ];
  infoSheet.addRows([
    { field: "活动标题", value: relay.title },
    { field: "活动时间", value: formatDateTime(relay.eventAt) },
    { field: "结束时间", value: relay.eventEndsAt ? formatDateTime(relay.eventEndsAt) : "" },
    { field: "地点", value: relay.location },
    { field: "报名截止", value: formatDateTime(relay.signupDeadline) },
    { field: "人数上限", value: relay.capacity ?? "不限" },
    { field: "状态", value: RELAY_STATUS_LABELS[relay.status] },
    { field: "正式人数", value: joinedCount },
    { field: "候补人数", value: waitlistCount },
    { field: "无法参加人数", value: declinedCount },
    { field: "正式参加人员", value: joinedParticipantNames },
    { field: "无法参加人员", value: declinedParticipantNames },
    { field: "导出时间", value: formatDateTime(new Date()) },
  ]);
  styleHeaderRow(infoSheet.getRow(1));

  infoSheet.addRow([]);
  infoSheet.addRow(["报名明细"]);
  const rosterHeader = infoSheet.addRow(["姓名", "状态", "备注"]);
  styleHeaderRow(rosterHeader);
  infoSheet.getColumn(3).width = 28;

  const rosterOrder: Array<"JOINED" | "WAITLISTED" | "DECLINED"> = [
    "JOINED",
    "WAITLISTED",
    "DECLINED",
  ];
  for (const response of rosterOrder) {
    for (const entry of relay.entries.filter((item) => item.response === response)) {
      const row = infoSheet.addRow([
        entry.user.displayName,
        rosterStatus(response),
        entry.note?.trim() ?? "",
      ]);
      row.font = { name: "Arial", size: 11, color: { argb: rosterColor(response) } };
    }
  }

  addParticipantSheet(workbook, "正式参加名单", expandParticipantRows(relay.entries, "JOINED"));
  addParticipantSheet(workbook, "候补名单", expandParticipantRows(relay.entries, "WAITLISTED"));

  const detailSheet = workbook.addWorksheet("报名明细");
  detailSheet.columns = [
    { header: "序号", key: "index", width: 8 },
    { header: "昵称", key: "displayName", width: 16 },
    { header: "用户名", key: "username", width: 18 },
    { header: "报名状态", key: "response", width: 12 },
    { header: "参加人数", key: "participantCount", width: 10 },
    { header: "同行人员", key: "companions", width: 32 },
    { header: "备注", key: "note", width: 28 },
    { header: "报名时间", key: "createdAt", width: 22 },
    { header: "最后更新", key: "updatedAt", width: 22 },
  ];
  relay.entries.forEach((entry, index) => {
    detailSheet.addRow({
      index: index + 1,
      displayName: entry.user.displayName,
      username: entry.user.username,
      response: RELAY_RESPONSE_LABELS[entry.response],
      participantCount: entry.participantCount,
      companions:
        entry.companionNames.length > 0
          ? entry.companionNames.join("、")
          : entry.participantCount > 1
            ? "历史数据未记录姓名"
            : "",
      note: entry.note ?? "",
      createdAt: formatDateTime(entry.createdAt),
      updatedAt: formatDateTime(entry.updatedAt),
    });
  });
  styleHeaderRow(detailSheet.getRow(1));
  detailSheet.views = [{ state: "frozen", ySplit: 1 }];
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: detailSheet.columnCount },
  };

  for (const sheet of workbook.worksheets) {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        const existing = cell.font ?? {};
        cell.font = { ...existing, name: "Arial", size: existing.size ?? 11 };
      });
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const safeTitle = relay.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  const filename = `${safeTitle}_${relay.eventAt.toISOString().slice(0, 10)}.xlsx`;
  return { buffer, filename };
}

function rosterStatus(response: "JOINED" | "WAITLISTED" | "DECLINED"): string {
  if (response === "JOINED") return "join";
  if (response === "WAITLISTED") return "waitlisted";
  return "declined";
}

function rosterColor(response: "JOINED" | "WAITLISTED" | "DECLINED"): string {
  if (response === "JOINED") return "FF15803D";
  if (response === "WAITLISTED") return "FFC2410C";
  return "FFB91C1C";
}

function addParticipantSheet(workbook: ExcelJS.Workbook, title: string, rows: ParticipantRow[]) {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: "序号", key: "index", width: 8 },
    { header: "参加人员", key: "participantName", width: 20 },
    { header: "人员类型", key: "participantType", width: 18 },
    { header: "报名成员", key: "registrantDisplayName", width: 16 },
    { header: "用户名", key: "registrantUsername", width: 18 },
    { header: "备注", key: "note", width: 28 },
    { header: "报名时间", key: "registeredAt", width: 22 },
  ];
  if (rows.length === 0) {
    sheet.addRow({
      index: "",
      participantName: "暂无记录",
      participantType: "",
      registrantDisplayName: "",
      registrantUsername: "",
      note: "",
      registeredAt: "",
    });
  } else {
    sheet.addRows(rows);
  }
  styleHeaderRow(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { name: "Arial", size: 11, bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
}
