# EIC FC 球队网站

域名：`czzczzzez.cloud`

完整产品与架构契约见 [ARCHITECTURE.md](ARCHITECTURE.md)。认证采用自研数据库 Cookie 会话（Argon2id + Session 表），不依赖 Auth.js。

## 技术栈

- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS + shadcn/ui
- Tiptap 富文本
- S3 兼容对象存储（开发 MinIO）
- Docker Compose + Caddy

## 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 环境变量
cp .env.example .env.local
# 按需修改 .env.local

# 3. 启动 PostgreSQL + MinIO
pnpm docker:dev:up

# 4. 生成客户端并迁移
pnpm db:generate
pnpm db:migrate

# 5. 创建首位队长（仅首次）
CAPTAIN_USERNAME=captain CAPTAIN_EMAIL=captain@example.com \
CAPTAIN_DISPLAY_NAME=队长 CAPTAIN_PASSWORD='your-long-password' \
pnpm captain:bootstrap

# 6. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

## 常用脚本

| 命令 | 说明 |
|------|------|
| `pnpm check` | 格式、lint、类型、单测、集成测试、构建 |
| `pnpm test` | 单元测试 |
| `pnpm test:integration` | 集成测试（需本地 PostgreSQL） |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm docker:prod:up` | 生产 Compose |

## 生产部署摘要

1. 准备可备案的大陆云服务器与域名实名
2. 配置 `.env`（勿提交）
3. `docker compose -f compose.prod.yml up -d --build`
4. `pnpm db:deploy`（或容器内迁移）
5. `pnpm captain:bootstrap`
6. 配置 DNS A 记录与 HTTPS（Caddy 自动签发）
7. 展示 ICP / 公安备案号

详细步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)、[docs/RUNBOOK.md](docs/RUNBOOK.md) 与 [docs/GO_LIVE.md](docs/GO_LIVE.md)。

**注意：本项目需要 Node.js 22+**（Prisma 7 / Vitest 4）。当前若本机为 Node 18，请先升级后再执行 `pnpm db:generate`、测试与构建。
