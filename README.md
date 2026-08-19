# EIC FC 球队网站

域名：`czzczzzez.cloud`

认证采用自研数据库 Cookie 会话（Argon2id + Session 表），不依赖 Auth.js。

不熟悉仓库时，先看 [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)。完整产品与架构契约见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 技术栈

- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- Tailwind CSS + shadcn/ui
- Tiptap 富文本
- S3 兼容对象存储（开发 MinIO）
- Docker Compose + Caddy

本项目需要 **Node.js 22+**（Prisma 7 / Vitest 4）。

## 项目导航

| 路径                                | 做什么                       |
| ----------------------------------- | ---------------------------- |
| `src/app`                           | 页面与 API 路由              |
| `src/server`                        | 服务端业务逻辑               |
| `src/components`                    | UI 组件                      |
| `src/schemas`                       | Zod 校验                     |
| `prisma`                            | 数据库模型与迁移             |
| `tests`                             | 单元 / 集成 / E2E            |
| `scripts`                           | 开发、部署、备份             |
| `docs`                              | 文档                         |
| `.agents` / `.claude` / `.windsurf` | AI 工具 Skills，不是应用源码 |
| `.next` / `src/generated`           | 生成物，可删后重建           |

## 本地开发

```bash
# 1. 安装依赖
pnpm install

# 2. 环境变量
cp .env.example .env.local
# 按需修改 .env.local

# 3. 启动 PostgreSQL + MinIO
pnpm docker:dev:up

# 4. 生成 Prisma Client 并迁移（克隆后必做）
pnpm db:generate
pnpm db:migrate

# 5. 创建首位队长（仅首次；也可用 seed 创建开发队长，见 RUNBOOK）
CAPTAIN_USERNAME=captain CAPTAIN_EMAIL=captain@example.com \
CAPTAIN_DISPLAY_NAME=队长 CAPTAIN_PASSWORD='your-long-password' \
pnpm captain:bootstrap

# 6. 启动开发服务器
pnpm dev
```

Windows 也可双击 `start-dev.cmd`，或执行 `pnpm dev:local`。

访问 http://localhost:3000

## 常用脚本

| 命令                    | 说明                                               |
| ----------------------- | -------------------------------------------------- |
| `pnpm check`            | 格式、lint、类型、单测、集成测试、构建（不含 E2E） |
| `pnpm test`             | 单元测试                                           |
| `pnpm test:integration` | 集成测试（需本地 PostgreSQL）                      |
| `pnpm test:e2e`         | Playwright E2E                                     |
| `pnpm docker:prod:up`   | 生产 Compose                                       |

## 文档索引

| 文档                                                             | 内容                 |
| ---------------------------------------------------------------- | -------------------- |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)           | 目录用途与能否删除   |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                     | 架构契约             |
| [docs/API.md](docs/API.md)                                       | API 摘要             |
| [docs/RUNBOOK.md](docs/RUNBOOK.md)                               | 本地启动、故障与备份 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                         | 大陆云部署           |
| [docs/GO_LIVE.md](docs/GO_LIVE.md)                               | 上线清单             |
| [docs/deployment-home-server.md](docs/deployment-home-server.md) | 旧电脑自托管         |
| [docs/BUGS.md](docs/BUGS.md)                                     | 缺陷记录             |

## 生产部署摘要

1. 准备可备案的大陆云服务器与域名实名
2. 配置 `.env`（勿提交）
3. `docker compose -f compose.prod.yml up -d --build`
4. `pnpm db:deploy`（或容器内迁移）
5. `pnpm captain:bootstrap`
6. 配置 DNS A 记录与 HTTPS（Caddy 自动签发）
7. 展示 ICP / 公安备案号

详细步骤见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)、[docs/RUNBOOK.md](docs/RUNBOOK.md) 与 [docs/GO_LIVE.md](docs/GO_LIVE.md)。
