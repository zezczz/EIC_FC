import ExcelJS from "exceljs";
import { db } from "@/server/db";
import { errNotFound } from "@/server/errors";
import { formatDateTime } from "@/lib/format";

const RESPONSE_LABELS = {
  JOINED: "参加",
  WAITLISTED: "候补",
  DECLINED: "无法参加",
} as const;

const STATUS_LABELS = {
  DRAFT: "草稿",
  OPEN: "开放",
  CLOSED: "已关闭",
  CANCELLED: "已取消",
  FINISHED: "已完成",
} as const;

type EntryWithUser = {
  id: string;
  response: "JOINED" | "WAITLISTED" | "DECLINED";
  participantCount: number;
  companionNames: string[];
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { username: string; email: string; displayName: string };
};

type ParticipantRow = {
  index: number;
  participantName: string;
  participantType: "报名成员" | "同行人员" | "历史数据未记录姓名";
  registrantDisplayName: string;
  registrantUsername: string;
  registrantEmail: string;
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
      registrantEmail: entry.user.email,
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

export async function buildRelayExportWorkbook(relayId: string) {
  const relay = await db.relay.findFirst({
    where: { id: relayId, deletedAt: null },
    include: {
      entries: {
        orderBy: [{ response: "asc" }, { createdAt: "asc" }],
        include: {
          user: { select: { username: true, email: true, displayName: true } },
        },
      },
    },
  });
  if (!relay) throw errNotFound("接龙不存在");

  const joinedCount = relay.entries
    .filter((entry) => entry.response === "JOINED")
    .reduce((sum, entry) => sum + entry.participantCount, 0);
  const waitlistCount = relay.entries.filter((entry) => entry.response === "WAITLISTED").length;

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
    { field: "状态", value: STATUS_LABELS[relay.status] },
    { field: "正式人数", value: joinedCount },
    { field: "候补人数", value: waitlistCount },
    { field: "导出时间", value: formatDateTime(new Date()) },
  ]);
  styleHeaderRow(infoSheet.getRow(1));

  addParticipantSheet(
    workbook,
    "正式参加名单",
    expandParticipantRows(relay.entries, "JOINED"),
  );
  addParticipantSheet(
    workbook,
    "候补名单",
    expandParticipantRows(relay.entries, "WAITLISTED"),
  );

  const detailSheet = workbook.addWorksheet("报名明细");
  detailSheet.columns = [
    { header: "序号", key: "index", width: 8 },
    { header: "昵称", key: "displayName", width: 16 },
    { header: "用户名", key: "username", width: 18 },
    { header: "邮箱", key: "email", width: 28 },
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
      email: entry.user.email,
      response: RESPONSE_LABELS[entry.response],
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
        cell.font = { name: "Arial", size: 11 };
      });
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const safeTitle = relay.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
  const filename = `${safeTitle}_${relay.eventAt.toISOString().slice(0, 10)}.xlsx`;
  return { buffer, filename };
}

function addParticipantSheet(
  workbook: ExcelJS.Workbook,
  title: string,
  rows: ParticipantRow[],
) {
  const sheet = workbook.addWorksheet(title);
  sheet.columns = [
    { header: "序号", key: "index", width: 8 },
    { header: "参加人员", key: "participantName", width: 20 },
    { header: "人员类型", key: "participantType", width: 18 },
    { header: "报名成员", key: "registrantDisplayName", width: 16 },
    { header: "用户名", key: "registrantUsername", width: 18 },
    { header: "邮箱", key: "registrantEmail", width: 28 },
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
      registrantEmail: "",
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
