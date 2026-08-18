/**
 * 本地新闻 + 接龙 API 验证脚本（仅开发环境手动执行）
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const CAPTAIN = {
  identity: "captain",
  password: "TestCaptain123!",
};
const MEMBER = {
  identity: "testmember01",
  password: "TestMember123!",
};

type Jar = Map<string, string>;

function parseSetCookie(header: string | null, jar: Jar) {
  if (!header) return;
  for (const part of header.split(/,(?=[^;]+?=)/)) {
    const [pair] = part.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) {
      jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }
}

function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function api(
  path: string,
  opts: { method?: string; body?: unknown; jar?: Jar; origin?: boolean } = {},
) {
  const jar = opts.jar ?? new Map<string, string>();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.origin !== false) headers.Origin = BASE;
  const cookie = cookieHeader(jar);
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  parseSetCookie(res.headers.get("set-cookie"), jar);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`${opts.method ?? "GET"} ${path} -> ${res.status}: ${text}`);
  }
  return { res, json, jar };
}

async function login(identity: string, password: string) {
  const jar: Jar = new Map();
  await api("/api/auth/callback/credentials", {
    method: "POST",
    body: { identity, password },
    jar,
  });
  return jar;
}

async function main() {
  console.log("[verify] 队长登录...");
  const captainJar = await login(CAPTAIN.identity, CAPTAIN.password);

  console.log("[verify] 上传封面图...");
  const imagePath = resolve("tests/fixtures/test-cover.png");
  const imageBytes = readFileSync(imagePath);
  const presign = await api("/api/captain/media/presign", {
    method: "POST",
    jar: captainJar,
    body: {
      originalName: "test-cover.png",
      mimeType: "image/png",
      sizeBytes: imageBytes.length,
      purpose: "ARTICLE_COVER",
    },
  });
  const assetId = (presign.json as { data: { asset: { id: string } } }).data.asset.id;
  const uploadUrl = (presign.json as { data: { uploadUrl: string } }).data.uploadUrl;
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: imageBytes,
  });
  if (!put.ok) throw new Error(`MinIO upload failed: ${put.status}`);
  await api("/api/captain/media/complete", {
    method: "POST",
    jar: captainJar,
    body: { id: assetId },
  });

  console.log("[verify] 创建新闻草稿...");
  const contentJson = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "这是一条本地验证测试新闻。" }],
      },
    ],
  };
  const created = await api("/api/captain/articles", {
    method: "POST",
    jar: captainJar,
    body: {
      title: "本地验证测试新闻",
      summary: "用于本地端到端验证的新闻摘要",
      contentJson,
      coverAssetId: assetId,
    },
  });
  const articleId = (created.json as { data: { id: string } }).data.id;

  console.log("[verify] 发布新闻...");
  await api(`/api/captain/articles/${articleId}/publish`, {
    method: "POST",
    jar: captainJar,
    body: {},
  });

  const publicList = await api("/api/articles", { jar: captainJar });
  const items = (publicList.json as { data: { items: Array<{ title: string }> } }).data.items;
  if (!items.some((i) => i.title === "本地验证测试新闻")) {
    throw new Error("公开新闻列表未找到已发布文章");
  }
  console.log("[verify] 新闻发布成功，公开列表可见");

  console.log("[verify] 创建接龙...");
  const now = Date.now();
  const signupDeadline = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
  const eventAt = new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString();
  const relayCreated = await api("/api/captain/relays", {
    method: "POST",
    jar: captainJar,
    body: {
      title: "本地验证友谊赛",
      description: "端到端验证接龙",
      location: "学校球场",
      eventAt,
      signupDeadline,
      capacity: 10,
      waitlistCapacity: 5,
    },
  });
  const relayId = (relayCreated.json as { data: { id: string } }).data.id;

  console.log("[verify] 开放接龙...");
  await api(`/api/captain/relays/${relayId}/open`, {
    method: "POST",
    jar: captainJar,
    body: {},
  });

  console.log("[verify] 成员登录并报名...");
  const memberJar = await login(MEMBER.identity, MEMBER.password);
  await api(`/api/relays/${relayId}/entry`, {
    method: "PUT",
    jar: memberJar,
    body: { note: "我能来" },
  });

  const relayDetail = await api(`/api/relays/${relayId}`, { jar: memberJar });
  const entry = (relayDetail.json as { data: { myEntry: { response: string } | null } }).data
    .myEntry;
  if (!entry || entry.response !== "JOINED") {
    throw new Error(`成员报名失败: ${JSON.stringify(entry)}`);
  }
  console.log("[verify] 接龙报名成功");

  console.log("\n全部本地 API 验证通过 ✓");
  console.log(`- 新闻 ID: ${articleId}`);
  console.log(`- 接龙 ID: ${relayId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
